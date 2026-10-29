import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const srcHtmlPath = path.resolve(rootDir, '../portal/codigo/app_src.html');
const figmaRendererPath = path.resolve(rootDir, '../portal/codigo/figma_renderer.js');

const rawHtml = fs.readFileSync(srcHtmlPath, 'utf-8');
const figmaRendererJs = fs.readFileSync(figmaRendererPath, 'utf-8');

// 1. Extraer CSS
const styleMatch = rawHtml.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) throw new Error("No se encontró tag <style>");
let css = styleMatch[1];

// Añadir estilos para el modal/sección de configuración de Antigravity (Gemini & Jira)
css += `
/* Estilos adicionales para configuración Antigravity */
.antigravity-badge {
  background: linear-gradient(135deg, #1D5C8F 0%, #5B4AC9 100%);
  color: white;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.btn-cfg-api {
  margin-left: 8px;
  border: 1px dashed var(--accent);
  color: var(--accent);
}
`;

fs.mkdirSync(path.resolve(rootDir, 'client/src/styles'), { recursive: true });
fs.writeFileSync(path.resolve(rootDir, 'client/src/styles/main.css'), css, 'utf-8');
console.log('✓ client/src/styles/main.css creado');

// 2. Extraer HTML del body
const htmlPartMatch = rawHtml.match(/<\/style>([\s\S]*?)<script type="text\/plain" id="figmaRenderer">/);
if (!htmlPartMatch) throw new Error("No se encontró bloque HTML");
let bodyHtml = htmlPartMatch[1].trim();

// Insertar badge de Antigravity en la marca superior
bodyHtml = bodyHtml.replace(
  '<div class="brand"><strong>Diseño con IA</strong><span id="siteLine">Conectando con Jira.</span></div>',
  '<div class="brand"><strong>Diseño con IA <span class="antigravity-badge">Antigravity</span></strong><span id="siteLine">Conectando con Jira y Gemini 3.8 Flash...</span></div>'
);

// Añadir campos de credenciales de Antigravity en el formulario de configuración (#cfgForm)
const cfgInsert = `
          <div class="ph-h" style="margin-top:16px"><h3>Conexión y APIs (Antigravity)</h3></div>
          <div class="fld"><label for="cGeminiKey">Google AI Studio API Key</label><input type="password" id="cGeminiKey" autocomplete="off" placeholder="AIzaSy..."><span class="hint">Usada para los 9 agentes con Gemini 3.8 Flash. También puedes configurarla en .env</span></div>
          <div class="row">
            <div class="fld"><label for="cJiraEmail">Jira Email</label><input type="email" id="cJiraEmail" autocomplete="off" placeholder="tu-correo@empresa.com"></div>
            <div class="fld"><label for="cJiraToken">Jira API Token</label><input type="password" id="cJiraToken" autocomplete="off" placeholder="ATATT3xFfGF0..."></div>
          </div>
`;
bodyHtml = bodyHtml.replace('</form>', `${cfgInsert}</form>`);

const fullIndexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diseño con IA · Antigravity (Gemini 3.8 Flash)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="/src/styles/main.css">
</head>
<body>
  ${bodyHtml}
  
  <script type="text/plain" id="figmaRenderer">${figmaRendererJs.replace(/<\/script>/g, '<\\/script>')}</script>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`;

fs.writeFileSync(path.resolve(rootDir, 'client/index.html'), fullIndexHtml, 'utf-8');
console.log('✓ client/index.html creado');

// 3. Extraer y adaptar el JavaScript
const jsMatch = rawHtml.match(/<script>\s*\(function\(\)\{\s*"use strict";([\s\S]*?)\}\)\(\);\s*<\/script>/);
if (!jsMatch) throw new Error("No se encontró el script JS");
let jsCode = jsMatch[1];

// Reemplazar el bloque final de arranque (líneas que llaman a window.claude)
const startOfBoot = jsCode.indexOf('(async()=>{');
if (startOfBoot === -1) throw new Error("No se encontró bloque de arranque async");
const jsCore = jsCode.slice(0, startOfBoot);

const modernBoot = `
// ==========================================
// ARRANGUE ANTIGRAVITY (Gemini 3.8 Flash + Firebase / IndexedDB + Jira REST)
// ==========================================
import { AIService } from './services/aiService.js';
import { DBService } from './services/dbService.js';
import { JiraService } from './services/jiraService.js';
import defaultDs from './figma/ds.json';

const aiService = new AIService();
const dbService = new DBService();
const jiraService = new JiraService();

// Configuración adicional en la UI
const origFillCfg = fillCfg;
fillCfg = function() {
  origFillCfg();
  fetch('/api/config').then(r => r.json()).then(cfg => {
    if ($("#cGeminiKey") && !$("#cGeminiKey").value && cfg.gemini?.hasKey) {
      $("#cGeminiKey").placeholder = "✓ Configurada en servidor (.env)";
    }
    if ($("#cJiraEmail") && cfg.jira?.hasEmail) {
      $("#cJiraEmail").value = cfg.jira.email || "";
    }
    if ($("#cJiraToken") && cfg.jira?.hasToken) {
      $("#cJiraToken").placeholder = "✓ Configurado en servidor (.env)";
    }
  }).catch(() => {});
};

const origSaveCfg = saveCfg;
saveCfg = async function(patch) {
  const gKey = $("#cGeminiKey") ? $("#cGeminiKey").value.trim() : "";
  const jEmail = $("#cJiraEmail") ? $("#cJiraEmail").value.trim() : "";
  const jToken = $("#cJiraToken") ? $("#cJiraToken").value.trim() : "";
  
  if (gKey) aiService.setApiKey(gKey);

  // Guardar en runtime backend
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        geminiKey: gKey || undefined,
        jiraEmail: jEmail || undefined,
        jiraToken: jToken || undefined,
        jiraBoard: patch.jiraBoard,
        jiraHost: jiraTarget().host
      })
    });
  } catch (e) {}

  await origSaveCfg(patch);
  initJira();
};

(async () => {
  const mcpAdapter = {
    callTool: async (server, tool, input, opts) => {
      if (server === "Atlassian MCP") {
        if (tool === "getAccessibleAtlassianResources") {
          return [{ id: "cloudId", url: jiraTarget().url || "https://pruebascluadegdi.atlassian.net" }];
        }
        if (tool === "searchJiraIssuesUsingJql") {
          const res = await jiraService.searchIssues(S.project || "KAN", input.maxResults || 50);
          return { issues: res.issues };
        }
        if (tool === "getJiraIssue") {
          return await jiraService.getIssue(input.issueIdOrKey);
        }
        if (tool === "createJiraIssue") {
          return await jiraService.createIssue({
            projectKey: input.projectKey || S.project,
            issueType: input.issueType || "Task",
            summary: input.summary,
            description: input.description,
            priority: input.priority,
            labels: input.labels
          });
        }
        if (tool === "addOrEditJiraIssueComment") {
          return await jiraService.addComment(input.issueIdOrKey, input.commentBody);
        }
      }
      if (server === "Figma") {
        console.log("Figma MCP Tool:", tool, input);
        return { success: true, pageName: "Pantallas IA", sectionName: "Propuesta" };
      }
      throw new Error("Tool no soportada: " + server + " -> " + tool);
    },
    watchTool: (server, tool, input, callback, opts) => {
      if (server === "Atlassian MCP" && tool === "searchJiraIssuesUsingJql") {
        return jiraService.watchIssues(S.project || "KAN", callback, opts?.refetchInterval || 60000);
      }
      return () => {};
    }
  };

  try {
    const cfgRes = await fetch('/api/config');
    const cfg = await cfgRes.json();
    if (cfg && cfg.firebase) {
      await dbService.init(cfg.firebase);
    }
  } catch (e) {
    console.warn("Aviso: backend config no accesible, usando modo local:", e);
  }

  S.mcp = mcpAdapter;
  S.sample = {
    json: (prompt, opts) => aiService.json(prompt, opts)
  };
  S.db = dbService;
  S.perms = { state: async () => ({}) };
  S.booted = true;

  // Precargar DS si no existe
  dbService.doc("config/ds").get().then(snap => {
    if (!snap.exists && defaultDs) {
      dbService.doc("config/ds").set(defaultDs);
    }
  });

  // Suscripciones reactivas
  dbService.collection("runs").onSnapshot(snap => {
    S.runs = {};
    snap.docs.forEach(d => { if (d.exists) S.runs[d.id] = d.data(); });
    S.runsLoaded = true;
    renderAll();
    scheduleAuto();
  }, () => { S.runsLoaded = true; });

  dbService.collection("flow").onSnapshot(snap => {
    S.flow = {};
    snap.docs.forEach(d => { if (d.exists) S.flow[d.id] = d.data(); });
    renderAll();
  }, () => {});

  dbService.doc("config/main").onSnapshot(s => {
    const prev = jiraTarget().url;
    S.cfg = (s.exists && s.data()) || {};
    fillCfg();
    renderAll();
    if (S.mcp && (!S.cfgLoaded || jiraTarget().url !== prev)) {
      S.cfgLoaded = true;
      initJira();
    }
    S.cfgLoaded = true;
  }, () => {
    if (!S.cfgLoaded && S.mcp) {
      S.cfgLoaded = true;
      initJira();
    }
  });

  dbService.doc("config/prompts").onSnapshot(s => {
    S.prompts = (s.exists && s.data()) || {};
    S.promptsVer = (S.promptsVer || 0) + 1;
    if (S.role === "orquestador") renderAll();
  }, () => {});

  dbService.doc("config/ds").onSnapshot(s => {
    S.ds = (s.exists && s.data()) || defaultDs || null;
    renderDsBox();
    renderAll();
  }, () => {});

  renderAll();
  initJira();
})();
`;

const modernMainJs = jsCore + modernBoot;

fs.writeFileSync(path.resolve(rootDir, 'client/src/main.js'), modernMainJs, 'utf-8');
console.log('✓ client/src/main.js creado con éxito');

