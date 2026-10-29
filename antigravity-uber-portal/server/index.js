import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GeminiClient } from './services/geminiClient.js';
import { JiraClient } from './services/jiraClient.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Middleware para normalizar la ruta en entornos serverless (como Vercel)
app.use((req, res, next) => {
  if (!req.url.startsWith('/api') && !req.url.startsWith('/assets') && req.url !== '/' && !req.url.startsWith('/favicon')) {
    req.url = '/api' + req.url;
  }
  next();
});

// Memoria volátil/caché de configuración runtime si el usuario la ajusta desde la UI
let runtimeConfig = {
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  jiraHost: process.env.JIRA_HOST || 'pruebasantigravity.atlassian.net',
  jiraEmail: process.env.JIRA_EMAIL || '',
  jiraToken: process.env.JIRA_API_TOKEN || '',
  jiraBoard: 'https://pruebasantigravity.atlassian.net/jira/software/projects/KAN/boards/1',
  figmaUrl: process.env.FIGMA_FILE_URL || 'https://www.figma.com/design/dcKVRyGjsYiK3Cl1iBHeXc/Untitled?node-id=0-1',
  figmaKey: process.env.FIGMA_FILE_KEY || 'dcKVRyGjsYiK3Cl1iBHeXc'
};

function getGeminiClient(req) {
  const key = req.headers['x-gemini-key'] || req.body?.apiKey || runtimeConfig.geminiKey;
  const model = req.headers['x-gemini-model'] || req.body?.model || runtimeConfig.geminiModel;
  return new GeminiClient(key, model);
}

function getJiraClient(req) {
  const host = req.headers['x-jira-host'] || runtimeConfig.jiraHost;
  const email = req.headers['x-jira-email'] || runtimeConfig.jiraEmail;
  const apiToken = req.headers['x-jira-token'] || runtimeConfig.jiraToken;
  return new JiraClient({ host, email, apiToken });
}

// ---------------- API GEMINI ----------------
app.post('/api/gemini/generate', async (req, res) => {
  const { prompt, model, temperature } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Falta el prompt en la petición.' });
  }

  try {
    const client = getGeminiClient(req);
    const data = await client.generateJSON(prompt, { model, temperature });
    res.json(data);
  } catch (err) {
    console.error('Error en /api/gemini/generate:', err);
    res.status(500).json({
      error: err.message || 'Error al comunicarse con Google AI Studio',
      code: 'gemini_error'
    });
  }
});

// ---------------- API JIRA ----------------
app.get('/api/jira/status', async (req, res) => {
  const client = getJiraClient(req);
  let authOk = false;
  let user = null;
  let authError = null;

  if (client.isConfigured()) {
    try {
      user = await client.verifyAuth();
      authOk = true;
    } catch (e) {
      authOk = false;
      authError = e.message;
    }
  }

  res.json({
    configured: client.isConfigured(),
    authOk,
    user: user?.displayName || user?.emailAddress || null,
    authError,
    host: client.host,
    hasEmail: Boolean(client.email),
    hasToken: Boolean(client.apiToken)
  });
});

app.get('/api/jira/search', async (req, res) => {
  const project = req.query.project || 'KAN';
  const maxResults = Number(req.query.maxResults) || 50;

  try {
    const client = getJiraClient(req);
    if (!client.isConfigured()) {
      return res.status(400).json({
        error: 'Jira no está configurado. Por favor ingresa tus credenciales en Ajustes o en el archivo .env',
        code: 'not_configured'
      });
    }

    const issues = await client.searchIssues(project, maxResults);
    res.json({ issues, storedAt: Date.now() });
  } catch (err) {
    console.error('Error en /api/jira/search:', err);
    res.status(500).json({ error: err.message, code: 'jira_error' });
  }
});

app.get('/api/jira/issue/:key', async (req, res) => {
  const { key } = req.params;

  try {
    const client = getJiraClient(req);
    const issue = await client.getIssue(key);
    res.json(issue);
  } catch (err) {
    console.error(`Error en /api/jira/issue/${key}:`, err);
    res.status(500).json({ error: err.message, code: 'jira_error' });
  }
});

app.post('/api/jira/create', async (req, res) => {
  const { projectKey, issueType, summary, description, priority, labels } = req.body;

  try {
    const client = getJiraClient(req);
    const result = await client.createIssue({
      projectKey,
      issueType,
      summary,
      description,
      priority,
      labels
    });
    res.json(result);
  } catch (err) {
    console.error('Error en /api/jira/create:', err);
    res.status(500).json({ error: err.message, code: 'jira_error' });
  }
});

app.post('/api/jira/comment', async (req, res) => {
  const { key, comment } = req.body;

  try {
    const client = getJiraClient(req);
    const result = await client.addComment(key, comment);
    res.json(result);
  } catch (err) {
    console.error('Error en /api/jira/comment:', err);
    res.status(500).json({ error: err.message, code: 'jira_error' });
  }
});

app.post('/api/jira/transition', async (req, res) => {
  const { key, target } = req.body;

  try {
    const client = getJiraClient(req);
    const result = await client.transitionIssue(key, target);
    res.json(result);
  } catch (err) {
    console.error('Error en /api/jira/transition:', err);
    res.status(500).json({ error: err.message, code: 'jira_error' });
  }
});

// ---------------- API FIGMA BRIDGE ----------------
let figmaPagesCache = [
  { id: "0:1", name: "Pantallas IA", sections: 0 }
];
let figmaPendingJobs = [];
let figmaJobResults = new Map();
let figmaLastSelection = null;
let figmaActivityLog = [];
let lastFigmaJob = null;

function addFigmaLog(msg, data) {
  const item = { time: new Date().toLocaleTimeString(), msg, data: data || null };
  figmaActivityLog.unshift(item);
  if (figmaActivityLog.length > 50) figmaActivityLog.pop();
  console.log(`[FigmaBridge ${item.time}] ${msg}`);
}

app.get('/api/figma/activity', (req, res) => {
  res.json({ ok: true, activity: figmaActivityLog, pendingCount: figmaPendingJobs.length });
});

app.get('/api/figma/pages', (req, res) => {
  res.json({ ok: true, pages: figmaPagesCache });
});

app.post('/api/figma/pages', (req, res) => {
  const { pages } = req.body || {};
  if (Array.isArray(pages) && pages.length > 0) {
    figmaPagesCache = pages;
    addFigmaLog(`Páginas actualizadas desde Figma: ${pages.length} páginas`);
  }
  res.json({ ok: true, pagesCount: figmaPagesCache.length });
});

app.post('/api/figma/execute', async (req, res) => {
  const { code, fileKey, description, key } = req.body || {};
  const jobId = 'job_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  addFigmaLog(`Nueva petición de render recibida para ${key || "propuesta"} (jobId: ${jobId}, código: ${code ? code.length : 0} bytes)`);
  
  const job = { id: jobId, code, fileKey, description, key, createdAt: Date.now() };
  lastFigmaJob = job;
  figmaPendingJobs.push(job);

  // Esperar hasta 15 segundos a que el plugin en Figma lo ejecute
  const startTime = Date.now();
  while (Date.now() - startTime < 15000) {
    if (figmaJobResults.has(jobId)) {
      const result = figmaJobResults.get(jobId);
      figmaJobResults.delete(jobId);
      addFigmaLog(`Trabajo ${jobId} completado exitosamente por el plugin de Figma`);
      return res.json(result);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  addFigmaLog(`Trabajo ${jobId} encolado (el plugin lo procesará en breve)`);
  // Si aún no respondió (plugin en segundo plano o tardando), responder ok preliminar
  res.json({
    ok: true,
    jobId,
    queued: true,
    result: { success: true, pageName: "Pantallas IA", sectionName: (key || "Tarea") + " v1" }
  });
});

app.get('/api/figma/pending-job', (req, res) => {
  if (figmaPendingJobs.length > 0) {
    const job = figmaPendingJobs.shift();
    addFigmaLog(`Entregando trabajo ${job.id} al plugin de Figma`);
    return res.json({ ok: true, job });
  }
  res.json({ ok: true, job: null });
});

app.get('/api/figma/last-job', (req, res) => {
  res.json({ ok: true, job: lastFigmaJob });
});

app.get('/api/figma/job-result/:jobId', (req, res) => {
  const data = figmaJobResults.get(req.params.jobId);
  res.json({ ok: true, data });
});

app.post('/api/figma/job-result', (req, res) => {
  const { jobId, success, result, error } = req.body || {};
  if (jobId) {
    figmaJobResults.set(jobId, { ok: true, success, result, error });
    addFigmaLog(`Resultado recibido de Figma para ${jobId}: ${success ? 'Éxito' : 'Error: ' + error}`);
  }
  res.json({ ok: true });
});

app.post('/api/figma/sync-selection', (req, res) => {
  figmaLastSelection = req.body;
  res.json({ ok: true });
});

app.get('/api/figma/sync-selection', (req, res) => {
  res.json({ ok: true, selection: figmaLastSelection });
});

// ---------------- CONFIG API ----------------
app.get('/api/config', (req, res) => {
  res.json({
    gemini: {
      hasKey: Boolean(runtimeConfig.geminiKey),
      model: runtimeConfig.geminiModel
    },
    jira: {
      hasConfig: Boolean(runtimeConfig.jiraHost && runtimeConfig.jiraEmail && runtimeConfig.jiraToken),
      host: runtimeConfig.jiraHost,
      hasEmail: Boolean(runtimeConfig.jiraEmail),
      hasToken: Boolean(runtimeConfig.jiraToken),
      board: runtimeConfig.jiraBoard
    },
    figma: {
      url: runtimeConfig.figmaUrl,
      key: runtimeConfig.figmaKey
    },
    firebase: {
      apiKey: process.env.VITE_FIREBASE_API_KEY || '',
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.VITE_FIREBASE_APP_ID || '',
      isConfigured: Boolean(process.env.VITE_FIREBASE_PROJECT_ID)
    }
  });
});

app.post('/api/config', (req, res) => {
  const { geminiKey, geminiModel, jiraHost, jiraEmail, jiraToken, jiraBoard } = req.body;

  if (geminiKey !== undefined) runtimeConfig.geminiKey = geminiKey;
  if (geminiModel !== undefined) runtimeConfig.geminiModel = geminiModel;
  if (jiraHost !== undefined) runtimeConfig.jiraHost = jiraHost;
  if (jiraEmail !== undefined) runtimeConfig.jiraEmail = jiraEmail;
  if (jiraToken !== undefined) runtimeConfig.jiraToken = jiraToken;
  if (jiraBoard !== undefined) runtimeConfig.jiraBoard = jiraBoard;

  res.json({ ok: true, message: 'Configuración actualizada en memoria' });
});

// En producción servir la build del cliente (solo si no es Vercel)
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Iniciar servidor local solo si no estamos en entorno Serverless (Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor backend ejecutándose en:`);
    console.log(`   - Local:   http://localhost:${PORT}`);
    console.log(`   - Red WiFi: http://0.0.0.0:${PORT}`);
  });
}

export default app;
