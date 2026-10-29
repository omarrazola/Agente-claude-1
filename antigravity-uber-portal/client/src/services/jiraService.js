export class JiraService {
  constructor() {
    this.intervalId = null;
  }

  async searchIssues(projectKey = 'KAN', maxResults = 50) {
    const res = await fetch(`/api/jira/search?project=${encodeURIComponent(projectKey)}&maxResults=${maxResults}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { code: err.code || 'jira_error', message: err.error || 'Error al buscar issues en Jira' };
    }
    return await res.json();
  }

  async getIssue(key) {
    const res = await fetch(`/api/jira/issue/${encodeURIComponent(key)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { code: err.code || 'jira_error', message: err.error || `Error al obtener ${key}` };
    }
    return await res.json();
  }

  async createIssue(payload) {
    const res = await fetch('/api/jira/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { code: err.code || 'jira_error', message: err.error || 'Error al crear la tarea en Jira' };
    }
    return await res.json();
  }

  async addComment(key, comment) {
    const res = await fetch('/api/jira/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, comment })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { code: err.code || 'jira_error', message: err.error || 'Error al añadir comentario en Jira' };
    }
    return await res.json();
  }

  async transitionIssue(key, target) {
    const res = await fetch('/api/jira/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, target })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { code: err.code || 'jira_error', message: err.error || 'Error al mover el issue' };
    }
    return await res.json();
  }

  watchIssues(projectKey, onEvent, intervalMs = 60000) {
    if (this.intervalId) clearInterval(this.intervalId);

    const poll = async () => {
      try {
        const data = await this.searchIssues(projectKey);
        onEvent({
          type: 'data',
          result: {
            issues: data.issues,
            cache: { storedAt: data.storedAt || Date.now() }
          }
        });
      } catch (err) {
        onEvent({
          type: 'error',
          error: err
        });
      }
    };

    poll(); // Primera ejecución inmediata
    this.intervalId = setInterval(poll, intervalMs);

    return () => {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    };
  }
}
