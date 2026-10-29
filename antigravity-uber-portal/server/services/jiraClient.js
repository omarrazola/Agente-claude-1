export class JiraClient {
  constructor(config = {}) {
    this.host = config.host || process.env.JIRA_HOST || 'pruebascluadegdi.atlassian.net';
    this.email = config.email || process.env.JIRA_EMAIL || '';
    this.apiToken = config.apiToken || process.env.JIRA_API_TOKEN || '';
  }

  isConfigured() {
    return Boolean(this.host && this.email && this.apiToken);
  }

  getAuthHeader() {
    if (!this.email || !this.apiToken) {
      throw new Error('Faltan credenciales de Jira (Email o API Token). Configúralas en .env o en Ajustes.');
    }
    const token = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    return `Basic ${token}`;
  }

  getBaseUrl() {
    let cleanHost = this.host.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    return `https://${cleanHost}`;
  }

  async request(path, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Jira no está configurado. Por favor ingresa tu host, email y API token.');
    }

    const url = `${this.getBaseUrl()}${path}`;
    const headers = {
      'Authorization': this.getAuthHeader(),
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorBody = '';
      try {
        const text = await res.text();
        errorBody = text;
        const json = JSON.parse(text);
        errorBody = json.errorMessages?.join(', ') || (json.errors ? JSON.stringify(json.errors) : '') || text || res.statusText;
      } catch (e) {
        if (!errorBody) errorBody = res.statusText;
      }
      throw new Error(`Error Jira [${res.status}]: ${errorBody}`);
    }

    if (res.status === 204) return null;
    return await res.json();
  }

  async verifyAuth() {
    return await this.request('/rest/api/3/myself');
  }

  async searchIssues(projectKey, maxResults = 50) {
    let jql = projectKey ? `project = "${projectKey}" AND issuetype not in subTaskIssueTypes() ORDER BY created DESC` : `issuetype not in subTaskIssueTypes() ORDER BY created DESC`;
    const fields = ["summary", "status", "created", "description", "labels", "priority", "issuetype"];
    
    // Lista de estrategias en orden
    const strategies = [
      // 1. POST /rest/api/3/search/jql
      () => this.request('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify({ jql, maxResults, fields })
      }),
      // 2. POST /rest/api/3/search
      () => this.request('/rest/api/3/search', {
        method: 'POST',
        body: JSON.stringify({ jql, maxResults, fields })
      }),
      // 3. GET /rest/api/3/search
      () => this.request(`/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=${fields.join(',')}`),
      // 4. GET /rest/api/2/search
      () => this.request(`/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=${fields.join(',')}`)
    ];

    let data = null;
    let lastErr = null;

    for (const runStrategy of strategies) {
      try {
        data = await runStrategy();
        if (data && (data.issues || Array.isArray(data))) break;
      } catch (err) {
        lastErr = err;
        // Si el error es que el proyecto específico no existe, reintentar con JQL genérico
        if (/project|does not exist/i.test(err.message) && jql.includes('project =')) {
          jql = `issuetype not in subTaskIssueTypes() ORDER BY created DESC`;
          try {
            data = await runStrategy();
            if (data && (data.issues || Array.isArray(data))) break;
          } catch (e) {}
        }
      }
    }

    if (!data && lastErr) {
      // Si la búsqueda falló, verificar si al menos la autenticación es válida
      try {
        const me = await this.verifyAuth();
        console.log(`[Jira] Usuario autenticado: ${me.displayName || me.emailAddress}, pero no hay incidencias o no existe el proyecto '${projectKey}'.`);
        return [];
      } catch (authErr) {
        throw lastErr;
      }
    }
    
    // Normalizar issues para el frontend
    return (data?.issues || []).map(n => {
      const f = n.fields || {};
      let descText = '';
      if (typeof f.description === 'string') {
        descText = f.description;
      } else if (f.description && f.description.content) {
        // Parsear Atlassian Document Format (ADF) simple a texto
        descText = this.adfToMarkdown(f.description);
      }

      return {
        key: n.key,
        id: n.id,
        summary: f.summary || '',
        status: f.status?.name || '',
        cat: f.status?.statusCategory?.key || '',
        created: f.created,
        description: descText,
        labels: f.labels || [],
        priority: f.priority?.name || '',
        type: f.issuetype?.name || '',
        url: `${this.getBaseUrl()}/browse/${n.key}`
      };
    });
  }

  async getIssue(key) {
    const data = await this.request(`/rest/api/3/issue/${key}?fields=summary,status,created,description,labels,priority,issuetype,comment`);
    const f = data.fields || {};
    
    let descText = typeof f.description === 'string' ? f.description : this.adfToMarkdown(f.description);
    const comments = (f.comment?.comments || []).map(c => ({
      id: c.id,
      author: c.author?.displayName || 'Alguien',
      body: typeof c.body === 'string' ? c.body : this.adfToMarkdown(c.body),
      created: c.created
    }));

    return {
      key: data.key,
      id: data.id,
      summary: f.summary || '',
      status: f.status?.name || '',
      cat: f.status?.statusCategory?.key || '',
      created: f.created,
      description: descText,
      labels: f.labels || [],
      priority: f.priority?.name || '',
      type: f.issuetype?.name || '',
      url: `${this.getBaseUrl()}/browse/${data.key}`,
      comments
    };
  }

  async createIssue({ projectKey, issueType = 'Task', summary, description, priority, labels = ['portal-diseno'] }) {
    const body = {
      fields: {
        project: { key: projectKey },
        summary: summary,
        issuetype: { name: issueType },
        labels: labels,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description || ''
                }
              ]
            }
          ]
        }
      }
    };

    if (priority) {
      body.fields.priority = { name: priority };
    }

    try {
      return await this.request('/rest/api/3/issue', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    } catch (err) {
      // Si falla por tipo 'Task', reintentar con 'Tarea'
      if (/issue ?type/i.test(err.message) && issueType === 'Task') {
        body.fields.issuetype = { name: 'Tarea' };
        return await this.request('/rest/api/3/issue', {
          method: 'POST',
          body: JSON.stringify(body)
        });
      }
      throw err;
    }
  }

  async addComment(key, text) {
    const body = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: text
              }
            ]
          }
        ]
      }
    };

    return await this.request(`/rest/api/3/issue/${key}/comment`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async transitionIssue(key, targetNameOrRegex) {
    const res = await this.request(`/rest/api/3/issue/${key}/transitions`);
    const transitions = res.transitions || [];
    
    let match = null;
    if (typeof targetNameOrRegex === 'string') {
      match = transitions.find(t => t.name.toLowerCase().includes(targetNameOrRegex.toLowerCase()));
    } else if (targetNameOrRegex instanceof RegExp) {
      match = transitions.find(t => targetNameOrRegex.test(t.name));
    }

    if (!match) {
      return { moved: false, reason: `No se encontró transición para "${targetNameOrRegex}" en ${key}` };
    }

    await this.request(`/rest/api/3/issue/${key}/transitions`, {
      method: 'POST',
      body: JSON.stringify({ transition: { id: match.id } })
    });

    return { moved: true, transition: match.name };
  }

  adfToMarkdown(adf) {
    if (!adf || typeof adf !== 'object') return '';
    let text = '';
    const extract = (node) => {
      if (!node) return;
      if (node.type === 'text') {
        text += node.text;
      }
      if (node.type === 'paragraph') {
        if (node.content) node.content.forEach(extract);
        text += '\n\n';
      } else if (node.type === 'heading') {
        const prefix = '#'.repeat(node.attrs?.level || 2) + ' ';
        text += prefix;
        if (node.content) node.content.forEach(extract);
        text += '\n\n';
      } else if (node.type === 'bulletList') {
        if (node.content) node.content.forEach(extract);
      } else if (node.type === 'listItem') {
        text += '* ';
        if (node.content) node.content.forEach(extract);
      } else if (node.content) {
        node.content.forEach(extract);
      }
    };
    extract(adf);
    return text.trim();
  }
}
