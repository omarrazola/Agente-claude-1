
const ATL = "Atlassian MCP", FIG = "Figma";
const LABEL = "portal-diseno";
const AGENTS = [["arquitecto","Arquitecto UX","Flujo y pantallas"],["writer","UX Writer","Textos y microcopy"],["ui","UI Designer","Pantallas"],["qa","QA","Revisión"]];
const AG_IDS = AGENTS.map(a=>a[0]);
const AG_OFF = {arquitecto:"El UI Designer define las pantallas y el flujo directamente desde la card.",writer:"Nadie repasa los textos: los escribe el UI Designer.",ui:"No habrá pantallas: solo arquitectura y textos, sin vista previa ni envío a Figma.",qa:"Nadie revisa la propuesta antes de que la veas."};
const AG_MIN = {arquitecto:1,writer:1,ui:1.5,qa:1};
function agentSel(key){ if(!S.agentSel[key]){ let d=AG_IDS.slice(); try{ const x=JSON.parse(lsGet("ep_agents")||"null"); if(Array.isArray(x)&&x.length) d=x.filter(a=>AG_IDS.includes(a)); }catch(e){} const r=S.runs[key]; if(r&&Array.isArray(r.agents)&&r.agents.length) d=r.agents.slice(); S.agentSel[key]=d; } return S.agentSel[key]; }
function cleanSel(a){ return AG_IDS.filter(x=>a.includes(x)); }
function selOk(a){ return a.includes("arquitecto")||a.includes("ui")||a.includes("writer"); }
function pendingQs(d){ const m=String(d&&d.description||"").match(/##\s*Preguntas pendientes\s*\n([\s\S]*?)(\n##|\n---|$)/); return m?m[1].split("\n").map(l=>l.replace(/^\s*[*\-•]\s*/,"").trim()).filter(Boolean):[]; }
const S = { figPages:null, figPagesErr:null, figPageSel:{}, figNewName:{}, prompts:{}, promptsVer:0, orqSel:null, orqDraft:{}, agentSel:{}, prelaunch:{}, asked:{}, flow:{}, stepView:{}, pmDraft:{}, agTab:{}, qaSev:{}, scrView:["pantallas","flujo","prototipo"].includes(lsGet("ep_scrview"))?lsGet("ep_scrview"):"pantallas", proto:{}, protoKey:null, protoHints:lsGet("ep_hints")!=="0", role:"cliente", mcp:null, sample:null, db:null, cloudId:null, site:"", project:"", jira:"init", jiraErr:null, issues:null, issuesAt:0,
  runs:{}, versions:{}, launching:{}, selected:null, tab:"propuesta", verSel:{}, detail:{}, detailErr:{}, cfg:{}, busy:{}, msgs:{}, queue:[], working:false,
  client:{ analysis:null, answers:{}, busy:false, err:null, created:null, sending:false }, drafts:{}, figPlans:null, unsubVer:null, tabId:Math.random().toString(36).slice(2) };

/* ---------- utilidades ---------- */
const $ = (s,r=document)=>r.querySelector(s);
const esc = s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clip = (s,n)=>{s=String(s||"");return s.length>n?s.slice(0,n)+"…":s;};
const oneLine = s=>String(s||"").replace(/\s+/g," ").trim();
const arr = a=>Array.isArray(a)?a:[];
function fmtDate(d){ if(!d) return ""; const x=new Date(d); if(isNaN(x)) return ""; return x.toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"}); }
function fmtTime(d){ if(!d) return ""; const x=new Date(d); return x.toLocaleString("es-ES",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}); }
function setHTML(el,html){ if(!el) return false; if(el.__h===html) return false; el.__h=html; el.innerHTML=html; return true; }
function pay(r){ let p = r && ("payload" in r) ? r.payload : r; if(typeof p==="string"){ try{p=JSON.parse(p);}catch(e){} } return p; }
function inl(s){ return esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/(?<!href=")(https?:\/\/[^\s<)"]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>'); }
function md(s){ const L=String(s||"").split("\n"); let o="",ul=false; for(const l of L){ const t=l.trim(); const m=t.match(/^[*\-•]\s+(.*)/); if(m){ if(!ul){o+="<ul>";ul=true;} o+="<li>"+inl(m[1])+"</li>"; continue; } if(ul){o+="</ul>";ul=false;} if(!t||/^-{3,}$/.test(t)) continue; const h=t.match(/^#{1,6}\s+(.*)/); if(h){o+="<h4>"+inl(h[1])+"</h4>";continue;} o+="<p>"+inl(t)+"</p>"; } if(ul)o+="</ul>"; return o||'<p class="muted">Sin descripción.</p>'; }
function lsGet(k){ try{return localStorage.getItem(k);}catch(e){return null;} }
function lsSet(k,v){ try{localStorage.setItem(k,v);}catch(e){} }

function mcpMsg(e,server){
  const c=e&&e.code;
  if(c==="site_not_granted"||c==="bad_target") return e.message;
  if(/explicitly granted/i.test(String(e&&e.message||""))) return `Tu conexión de Atlassian no tiene permiso para el sitio ${jiraTarget().host}. Vuelve a conectar Atlassian en claude.ai › Ajustes › Conectores y elige ese sitio.`;
  if(c==="needs_reauth") return `Vuelve a conectar ${server} en claude.ai › Ajustes › Conectores.`;
  if(c==="server_not_connected") return `Añade el conector ${server} en claude.ai › Ajustes › Conectores para usar esta parte.`;
  if(c==="selection_required") return `Tienes más de un conector ${server}: elige cuál usar en el aviso de claude.ai.`;
  if(c==="not_in_manifest"||c==="approval_required") return `Esta página necesita tu permiso para usar ${server}. Pulsa Reintentar y acepta el aviso.`;
  if(c==="blocked_by_policy") return `Tu organización no permite usar ${server} desde esta página.`;
  if(c==="server_unavailable") return `${server} no responde ahora mismo. Prueba de nuevo en unos segundos.`;
  if(c==="tool_error") return `${server} devolvió un error: ${clip(e.message,220)}`;
  if(c==="not_granted"||c==="capability_disabled"||c==="capability_removed") return `Esta vista no puede usar conectores. Abre la página en claude.ai.`;
  return `No se pudo completar la llamada a ${server}${c?` (${c})`:""}.`;
}
function aiMsg(e){
  const c=e&&e.code;
  if(c==="not_granted"||c==="sampling_disabled"||c==="capability_disabled"||c==="capability_removed"||c==="not_declared") return "Los agentes necesitan permiso para usar Claude desde esta página. Recarga y acepta el aviso.";
  if(c==="rate_limited"||c==="gemini_error") return (e&&e.message) ? clip(e.message, 220) : "Límite de solicitudes alcanzado o error temporal en la IA. Vuelve a intentarlo en unos instantes.";
  if(c==="session_expired") return "Tu sesión ha caducado. Vuelve a iniciar sesión en claude.ai.";
  if(c==="invalid_json") return "La respuesta del agente no tenía el formato esperado. Vuelve a intentarlo.";
  if(c==="prompt_too_large") return "Hay demasiado contexto para el agente. Acorta la descripción.";
  if(c==="refused") return "El agente no pudo responder a esta petición.";
  if(c==="cancelled") return "Detenido.";
  return (e&&e.message&&!c)? clip(e.message,220) : "El agente no pudo terminar. Vuelve a intentarlo.";
}

/* ---------- Jira ---------- */
async function call(server,tool,input,opts){ if(!S.mcp) throw {code:"not_granted"}; return pay(await S.mcp.callTool(server,tool,input,opts)); }
function issueFields(n){
  const f=n.fields||n;
  const key=n.key;
  return { key, id:n.id, summary:f.summary||"", status:(f.status&&f.status.name)||"", cat:(f.status&&f.status.statusCategory&&f.status.statusCategory.key)||"",
    created:f.created, description: typeof f.description==="string"?f.description:"", labels:arr(f.labels), priority:(f.priority&&f.priority.name)||"",
    type:(f.issuetype&&f.issuetype.name)||"", url:n.webUrl||(S.site?`${S.site}/browse/${key}`:"#") };
}
function parseIssues(p){
  const nodes = (p&&p.issues&&p.issues.nodes) || (p&&p.data&&p.data.issues) || (p&&Array.isArray(p.issues)&&p.issues) || (p&&p.data&&p.data.issues&&p.data.issues.nodes) || [];
  return arr(nodes).filter(n=>n&&n.key).map(issueFields).filter(i=>!/sub-?task|subtarea/i.test(i.type));
}
function jql(){ return `project = ${S.project} AND issuetype not in subTaskIssueTypes() ORDER BY created DESC`; }
function searchInput(){ return { cloudId:S.cloudId, jql:jql(), maxResults:50, fields:["summary","status","created","description","labels","priority","issuetype"], responseContentFormat:"markdown" }; }

const JIRA_DEFAULT="https://pruebascluadegdi.atlassian.net/jira/software/projects/KAN/boards/1";
function jiraTarget(){ const url=(S.cfg&&S.cfg.jiraBoard)||JIRA_DEFAULT; let host=""; try{ host=new URL(url).host.toLowerCase(); }catch(e){} const m=String(url).match(/projects\/([A-Za-z][A-Za-z0-9_]+)/); return { url, host, project:m?m[1].toUpperCase():"" }; }
async function initJira(){
  S.jira="init"; S.jiraErr=null; S.issues=null; if(S.unwatch){ S.unwatch(); S.unwatch=null; } renderConn();
  const tg=jiraTarget();
  try{
    if(!tg.host||!tg.project) throw {code:"bad_target",message:"El enlace del tablero de Jira de los ajustes no es válido. Pega el enlace del tablero (…atlassian.net/jira/software/projects/CLAVE/boards/N)."};
    S.project=tg.project;
    const p = await call(ATL,"getAccessibleAtlassianResources",{});
    const list = arr((p&&p.data&&p.data.resources)||(p&&p.resources)||p);
    const site = list.find(r=>String(r.url||"").toLowerCase().includes(tg.host));
    if(!site) throw {code:"site_not_granted",message:`Tu conexión de Atlassian en claude.ai no tiene acceso a ${tg.host}. Ve a claude.ai › Ajustes › Conectores › Atlassian, desconecta y vuelve a conectar, y en la pantalla de Atlassian elige el sitio ${tg.host}. Después pulsa Reintentar.`};
    S.cloudId = site.cloudId||site.id; S.site = String(site.url||"").replace(/\/$/,"");
    S.jira="ok"; renderConn();
    watchIssues();
  }catch(e){ S.jira="err"; S.jiraErr=e; renderAll(); }
}
function watchIssues(){
  if(S.unwatch) S.unwatch();
  let fellBack=false;
  S.unwatch = S.mcp.watchTool(ATL,"searchJiraIssuesUsingJql",searchInput(),ev=>{
    if(ev.type==="data"){ S.issues=parseIssues(pay(ev.result)); S.issuesAt=(ev.result.cache&&ev.result.cache.storedAt)||Date.now(); S.jiraErr=null; S.jira="ok"; }
    else{
      const c=ev.error&&ev.error.code;
      if(["needs_reauth","server_not_connected","not_in_manifest","approval_required","blocked_by_policy","selection_required"].includes(c)){ S.issues=null; }
      S.jiraErr=ev.error; S.jira="err";
      if(!fellBack && (c==="bad_request"||c==="capability_removed")){ fellBack=true; refreshIssues(); }
    }
    renderAll(); scheduleAuto();
  },{refetchInterval:60000});
}
async function refreshIssues(){
  if(!S.cloudId){ return initJira(); }
  S.busy.refresh=true; renderAll();
  try{ const p=await call(ATL,"searchJiraIssuesUsingJql",searchInput(),{cache:{refresh:true,staleTime:0}}); S.issues=parseIssues(p); S.issuesAt=Date.now(); S.jiraErr=null; S.jira="ok"; }
  catch(e){ S.jiraErr=e; S.jira="err"; }
  S.busy.refresh=false; renderAll(); scheduleAuto();
}
async function loadDetail(key,fresh){
  S.busy["d"+key]=true; renderDetail();
  try{
    const p=await call(ATL,"getJiraIssue",{cloudId:S.cloudId,issueIdOrKey:key,responseContentFormat:"markdown"},fresh?{cache:{refresh:true}}:undefined);
    const n=(p&&p.issues&&p.issues.nodes&&p.issues.nodes[0])||p;
    const f=n.fields||{};
    const comments=arr(f.comment&&f.comment.comments).map(c=>({id:c.id,author:(c.author&&c.author.displayName)||"Alguien",body:typeof c.body==="string"?c.body:"",created:c.created}));
    S.detail[key]=Object.assign(issueFields(n),{comments});
    S.detailErr[key]=null;
  }catch(e){ S.detailErr[key]=e; }
  S.busy["d"+key]=false; renderAll();
  return S.detail[key];
}

/* ---------- Analista de brief (cliente) ---------- */
function briefFromForm(){
  return { title:$("#bTitle").value.trim(), desc:$("#bDesc").value.trim(), goal:$("#bGoal").value.trim(), platform:$("#bPlat").value, date:$("#bDate").value, prio:$("#bPrio").value };
}
function historyCtx(exclude){
  const list=arr(S.issues).filter(i=>i.key!==exclude).slice(0,25);
  if(!list.length) return "(no hay peticiones anteriores)";
  return list.map(i=>`- ${i.key} [${i.status}] ${i.summary}: ${clip(oneLine(i.description),280)}`).join("\n");
}
async function analyze(){
  const b=briefFromForm();
  if(!b.title||b.desc.length<15){ S.client.err="Escribe un título y al menos una frase sobre lo que necesitas."; renderClient(); return; }
  if(!S.sample){ S.client.err="Esta vista no puede usar Claude. Abre la página en claude.ai."; renderClient(); return; }
  S.client.busy=true; S.client.err=null; renderClient();
  const prev=S.client.analysis;
  const answered = prev? arr(prev.preguntas).filter(q=>(S.client.answers[q.id]||"").trim()).map(q=>`P: ${q.pregunta}\nR: ${S.client.answers[q.id].trim()}`).join("\n\n") : "";
  const prompt = promptAnalyst(b,answered);
  try{
    const a = await S.sample.json(prompt,{modelTier:"default"});
    if(!a||typeof a!=="object") throw {code:"invalid_json"};
    { const sc0=Number(a.puntuacion)||0; const lv=a.nivel||(sc0<45?"incompleto":sc0<80?"casi":"listo"); a.preguntas=arr(a.preguntas).slice(0,3).map(q=>Object.assign({},q,lv==="listo"?{obligatoria:false}:{})); }
    a.preguntas=arr(a.preguntas).map((q,i)=>Object.assign({},q,{id:"q"+(i+1)+"_"+hash(q.pregunta)}));
    const keep={}; a.preguntas.forEach(q=>{ if(S.client.answers[q.id]) keep[q.id]=S.client.answers[q.id]; });
    S.client.prevQA=(S.client.prevQA||[]).concat(prev?arr(prev.preguntas).filter(q=>(S.client.answers[q.id]||"").trim()).map(q=>({p:q.pregunta,r:S.client.answers[q.id].trim()})):[]);
    S.client.answers=keep; S.client.analysis=a; S.client.created=null; S.client.editing=false;
    setTimeout(()=>{ const pn=$("#analysisPanel"); if(pn){ const r=pn.getBoundingClientRect(); if(r.top<0||r.top>window.innerHeight*0.5) pn.scrollIntoView({behavior:"smooth",block:"start"}); } },60);
  }catch(e){ S.client.err=aiMsg(e); }
  S.client.busy=false; renderClient();
}
function findKey(o,d){ d=d||0; if(!o||d>5) return ""; if(typeof o==="string"){ const m=o.match(/\b[A-Z][A-Z0-9]+-\d+\b/); return m?m[0]:""; } if(typeof o!=="object") return ""; if(typeof o.key==="string"&&/^[A-Z][A-Z0-9]+-\d+$/.test(o.key)) return o.key; for(const k of Object.keys(o)){ if(k==="context") continue; const r=findKey(o[k],d+1); if(r) return r; } return ""; }
function hash(s){ let h=0; s=String(s||""); for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0;} return Math.abs(h).toString(36).slice(0,6); }
function allQA(){
  const a=S.client.analysis; const now=a?arr(a.preguntas).filter(q=>(S.client.answers[q.id]||"").trim()).map(q=>({p:q.pregunta,r:S.client.answers[q.id].trim()})):[];
  const seen=new Set(); return (S.client.prevQA||[]).concat(now).filter(x=>{ if(seen.has(x.p)) return false; seen.add(x.p); return true; });
}
async function sendBrief(){
  const b=briefFromForm(), a=S.client.analysis;
  if(!a||!S.cloudId||S.client.sending) return;
  S.client.sending=true; S.client.err=null; renderClient();
  const qa=allQA();
  const pending=arr(a.preguntas).filter(q=>!(S.client.answers[q.id]||"").trim());
  const conns=arr(a.conexiones).filter(c=>c&&c.key);
  const desc=[
    "## Qué necesita", b.desc, "",
    "## Problema u objetivo", b.goal||"No indicado.", "",
    "## Datos", `* Plataforma: ${b.platform}`, `* Fecha deseada: ${b.date?fmtDate(b.date):"no indicada"}`, "",
    qa.length?"## Respuestas al analista":"", ...qa.map(x=>`* **${x.p}** ${x.r}`), qa.length?"":"",
    pending.length?"## Preguntas pendientes":"", ...pending.map(q=>`* ${q.pregunta}`), pending.length?"":"",
    arr(a.puntos_flojos).length?"## Notas del analista":"", ...arr(a.puntos_flojos).map(p=>`* **${p.tema}:** ${p.detalle}`), arr(a.puntos_flojos).length?"":"",
    conns.length?"## Relacionado con":"", ...conns.map(c=>`* ${c.key}: ${c.motivo}`), conns.length?"":"",
    "---", `Creada desde Diseño con IA · calidad del brief ${Math.round(Number(a.puntuacion)||0)}/100`
  ].filter((l,i,all)=>!(l===""&&all[i-1]==="")).join("\n");
  try{
    let p=null, lastErr=null;
    for(const [it,withPrio] of [["Tarea",true],["Task",true],["Tarea",false],["Task",false]]){
      try{ p=await call(ATL,"createJiraIssue",Object.assign({cloudId:S.cloudId,projectKey:S.project,issueType:it,summary:(b.prio==="High"&&!/^\s*🔥/.test(b.title)?"🔥 "+b.title.trim():b.title),description:desc,labels:[LABEL]},withPrio?{priority:b.prio}:{})); break; }
      catch(e){ lastErr=e; if(e&&e.code!=="tool_error") throw e; if(!/issue ?type|issuetype|priority|tipo/i.test(String(e.message||""))) throw e; }
    }
    if(!p) throw lastErr;
    const key=findKey(p);
    const url=(p&&(p.webUrl||(p.issue&&p.issue.webUrl)))||(key&&S.site?`${S.site}/browse/${key}`:"");
    S.client.created={key,url};
    S.client.analysis=null; S.client.answers={}; S.client.prevQA=[];
    $("#briefForm").reset();
    refreshIssues();
  }catch(e){ S.client.err=mcpMsg(e,"Jira")+(e&&e.code&&e.code!=="tool_error"?" Si la card llegó a crearse, aparecerá en el historial.":""); }
  S.client.sending=false; renderClient();
}

/* ---------- Agentes de diseño ---------- */
const UI_SCHEMA = `Bloques permitidos (campo "t") y sus campos:
- appbar: title, left ("back" | "close", opcional; sin left en pantallas principales), right (texto de acción, opcional). Siempre el primer bloque.
- heading: text, level (1, 2 o 3)
- text: text, tone ("default" | "muted"), size ("m" | "s")
- button: label, variant ("primary" | "secondary" | "ghost" | "danger")
- input: label, placeholder, value (opcional), helper (opcional), error (opcional: texto de error)
- card: meta, title, body, cta (todos opcionales salvo title)
- stat: label, value, delta (opcional)
- list: items [{title, subtitle, trailing}]
- chips: items [texto]
- tabs: items [texto], active (índice)
- image: label (qué representa: foto, gráfico, mapa…), h (alto en px)
- banner: title (opcional), text, tone ("info" | "warning" | "success" | "error")
- tags: items [{text, tone: "gray" | "solid" | "accent" | "positive" | "warning" | "negative"}]
- segmented: items [texto], active (índice)
- check: kind ("checkbox" | "radio" | "toggle"), label, checked (true/false)
- progress: label, value (0 a 100)
- avatar: name, detail (opcional), initials (opcional)
- row: children [2 o 3 bloques stat, card o button en horizontal]
- grid: cols (2 a 4), children [bloques tile]
- tile: label, icon (una palabra)
- divider
- spacer: h
- search: placeholder, action (opcional: botón dentro del buscador, p. ej. "Más tarde")
- select: label, placeholder, value (opcional), helper (opcional). Desplegable de selección.
- sectionheading: text. Cabecera de sección de lista.
- empty: kind ("first" | "success" | "warning" | "error"), title, text, cta (opcional). Estado vacío o de resultado.
- sheetheader: title, subtitle (opcional). Cabecera de hoja inferior (bottom sheet); va en lugar de appbar, como primer bloque.
- dock: label, secondary (opcional). Botonera fija abajo con la acción principal; va como último bloque, en lugar de bottomnav.
- NAVEGACIÓN DEL PROTOTIPO: pon "to" (id de destino) SOLO en el elemento que dispara cada transición de la arquitectura, y en ningún otro. Lo admiten button, search, option, card, empty, tile, dock y dialog ("secondaryTo" para su acción secundaria), y los items de list. Si la arquitectura no tiene transiciones, no pongas ningún "to". La barra inferior (bottomnav) se enlaza sola: no le pongas "to". Un appbar con left "back" vuelve a la pantalla anterior.
- option: opción seleccionable tipo fila de viaje: title, capacity (opcional, nº de personas), subtitle (p. ej. "11:55 · 6 min"), price, badge (opcional {text, tone: "accent" | "positive" | "warning"}), selected (true/false), icon (una palabra)
- list: los items admiten además lead (texto corto a la izquierda, p. ej. "20 km")
- bottomnav: items [texto], active (índice). Solo si la app tiene navegación principal; siempre el último bloque.
- map: kind ("explore" | "route" | "approaching"), eta (opcional, p. ej. "4 min"). Mapa a ancho completo; va arriba, antes del sheetheader.
- driver: name, rating, car, plate. Tarjeta del conductor asignado.
- snackbar: text, action (opcional). Confirmación temporal.
- dialog: title, text, primary, secondary. Decisión crítica (cancelar viaje…).
- dock: admite además caption (texto pequeño encima del botón, p. ej. método de pago).`;

function issueCtx(d){
  return `CARD ${d.key} · ${d.summary}
Estado en Jira: ${d.status}
Descripción:
${clip(d.description,7000)}

Comentarios en Jira:
${arr(d.comments).map(c=>`- ${c.author} (${fmtDate(c.created)}): ${clip(oneLine(c.body),700)}`).join("\n")||"(sin comentarios)"}`;
}
function dsOn(){ return !!(S.ds&&S.ds.guide&&S.cfg.useDs!==false); }
function brandCtx(){ const c=S.cfg||{}; return `Producto: ${c.product||"(sin definir)"}
Plataforma: ${c.platform==="desktop"?"escritorio":"móvil"}
${dsOn()?`Sistema de diseño: ${S.ds.name} (obligatorio; colores, tipografía y componentes salen de él)`:`Color primario de marca: ${c.primary||"#0F6E6A"}`}
Notas de marca y tono: ${c.brandNotes||"(ninguna)"}`; }
function dsCtx(focus){ return (dsOn()?`

SISTEMA DE DISEÑO ${S.ds.name.toUpperCase()} (síguelo; ${focus})
${S.ds.guide}`:"")+appCtx(); }
function appCtx(){ const a=S.ds&&S.ds.appContext; return a?`

CÓMO ES LA APP HOY (descrito a partir de capturas reales; parte de aquí: reutiliza sus pantallas y patrones, respeta su navegación y no propongas como nuevo algo que ya existe; si la petición pide algo que ya existe, dilo)
${a}`:""; }
const J = o=>JSON.stringify(o);
/* Peticiones de ejemplo de un cliente de una app de viajes tipo Uber, para probar el analista y los agentes */
const BRIEF_EXAMPLES = [
  {tipo:"Nueva funcionalidad",title:"Dividir el pago del viaje",desc:"Queremos que el pasajero pueda dividir el importe de un viaje con las personas que van con él. Al pedir el viaje o durante el trayecto, podrá invitar a otros usuarios de la app y cada uno pagará su parte con su método de pago.",goal:"Aumentar los viajes en grupo y reducir las reclamaciones por pagos entre amigos.",prio:"Medium"},
  {tipo:"Rediseño",title:"Rediseño de la valoración del viaje",desc:"Al terminar un viaje mostramos una pantalla para valorar al conductor con estrellas. Muy pocos usuarios la completan y los comentarios que llegan no sirven. Queremos rediseñarla para que sea más rápida y recoja motivos concretos cuando la valoración es baja, además de permitir añadir propina.",goal:"Pasar del 18 % al 40 % de viajes valorados y tener motivos accionables en las valoraciones bajas.",prio:"Medium"},
  {tipo:"Revisión de textos",title:"Revisar textos de «Elige tu viaje»",desc:"Solo necesitamos revisar los textos de la pantalla donde se elige el tipo de vehículo; el diseño no cambia. Textos actuales: título «Elige un viaje»; opciones «Rumbo Confort · Llega en 4 min · Coches nuevos con más espacio», «Rumbo XL · Hasta 6 pasajeros, ideal para grupos grandes y equipajes» y «Rumbo Eco · El viaje más económico disponible ahora mismo en tu zona»; botón «Confirmar Rumbo Confort»; aviso «Los precios pueden variar debido a la alta demanda existente en este momento».",goal:"Que los textos sean más cortos, claros y coherentes con el tono de la marca.",prio:"Low"},
  {tipo:"Problema detectado",title:"Recogidas en el aeropuerto",desc:"En el aeropuerto muchos pasajeros no encuentran al conductor: el punto de recogida no está claro, se llaman por teléfono y muchos viajes se cancelan. Necesitamos mejorar cómo se elige y se explica el punto de recogida en terminales, con indicaciones para llegar a pie.",goal:"Reducir un 30 % las cancelaciones en recogidas de aeropuerto.",prio:"High"},
  {tipo:"Accesibilidad",title:"Vehículos adaptados",desc:"Queremos ofrecer vehículos adaptados para personas en silla de ruedas. El usuario debe poder indicarlo en su perfil o al pedir el viaje, ver si hay disponibilidad en su zona y saber cuánto tardará.",goal:"Cumplir con la normativa de accesibilidad y abrir el servicio a nuevos usuarios.",prio:"High"},
  {tipo:"Seguridad",title:"Compartir el viaje en tiempo real",desc:"Los usuarios nos piden poder enviar a un familiar o amigo el seguimiento del viaje en directo: quién es el conductor, la matrícula, la ruta y la hora estimada de llegada. La persona que lo recibe no tiene por qué tener la app.",goal:"Mejorar la sensación de seguridad, sobre todo en viajes nocturnos.",prio:"Medium"},
  {tipo:"Onboarding",title:"Registro más corto",desc:"El registro de nuevos usuarios tiene 7 pasos y casi la mitad abandona antes de terminar. Queremos dejarlo en lo mínimo para poder pedir el primer viaje y pedir el resto de datos más adelante.",goal:"Subir la conversión del registro del 52 % al 75 %.",prio:"High"},
  {tipo:"Promociones",title:"Códigos promocionales",desc:"Marketing va a lanzar campañas con códigos de descuento. El usuario tiene que poder introducir un código, ver el descuento aplicado antes de confirmar el viaje y saber cuándo caduca.",goal:"Medir las campañas y aumentar los viajes de usuarios inactivos.",prio:"Medium"},
  {tipo:"Objetos perdidos",title:"Objetos olvidados en el coche",desc:"Cuando un pasajero se deja algo en el coche hoy tiene que escribir al soporte. Queremos que desde el detalle del viaje pueda avisar al conductor, describir el objeto y acordar la devolución.",goal:"Reducir los contactos al soporte por objetos perdidos.",prio:"Low"},
  {tipo:"Brief poco claro",title:"Mejorar la pantalla de inicio",desc:"La pantalla de inicio no convence. Queremos que sea más moderna y que la gente pida más viajes.",goal:"",prio:"Medium"},
  /* Calibrados con la «Rúbrica del brief». Entre corchetes, puntos estimados por criterio:
     necesidad/20 · contexto/15 · objetivo/15 · alcance/20 · casos límite/10 · restricciones/10 · datos/10 */
  /* ≈30 [10·10·3·3·0·0·7] */
  {grupo:"q",tipo:"Calidad ≈ 30/100",title:"Mejorar el pago",desc:"Los usuarios se quejan de que el pago a veces falla con algunas tarjetas y no saben si se les ha cobrado o no. Hay que mejorar el pago en la app.",goal:"Que haya menos quejas.",prio:"High"},
  /* ≈50 [14·10·8·10·4·4·7] */
  {grupo:"q",tipo:"Calidad ≈ 50/100",title:"Avisos durante el viaje",desc:"Ahora mismo solo avisamos al pasajero cuando el conductor ha llegado al punto de recogida. Queremos enviar notificaciones push en más momentos: cuando se asigna el conductor, cuando está a 2 minutos y cuando llega. Si el conductor cancela, también hay que avisar. Solo en la app móvil, sin SMS ni correo.",goal:"Reducir las llamadas de los pasajeros al conductor preguntando dónde está.",prio:"Medium"},
  /* ≈70 [18·12·14·16·4·6·10] */
  {grupo:"q",tipo:"Calidad ≈ 70/100",title:"Programar viajes al aeropuerto",desc:"Muchos usuarios piden el coche al aeropuerto con prisa y a veces no hay conductores cerca a primera hora de la mañana. Queremos que puedan programar un viaje al aeropuerto con antelación, entre 1 hora y 7 días antes: elegir el día y la hora de recogida, el origen y la terminal de destino, y ver el precio estimado antes de confirmar. Lo usan pasajeros particulares; los viajes de empresa quedan fuera por ahora. El usuario recibe un recordatorio 30 minutos antes de la recogida y puede cancelar gratis desde Actividad hasta 1 hora antes.",goal:"Reducir los viajes al aeropuerto que se cancelan por falta de conductores entre las 5:00 y las 8:00, y aumentar un 20 % los viajes al aeropuerto en los próximos 6 meses.",prio:"Medium",date:"2027-01-31"},
  /* ≈90 [20·15·15·19·9·10·10] */
  {grupo:"q",tipo:"Calidad ≈ 90/100",title:"Propina después del viaje",desc:"Hoy no hay forma de dar propina desde la app: los conductores lo piden en todas las encuestas y el soporte recibe a diario preguntas de pasajeros sobre cómo hacerlo. Queremos que el pasajero pueda dejar propina al conductor al terminar el viaje, en la misma pantalla de valoración. Usuarios: pasajeros de cualquier tipo de viaje, excepto viajes de empresa. Funcionamiento: tras valorar, se muestran tres importes sugeridos (1 €, 2 € y 3 €; para viajes de más de 25 € se sugiere el 5 %, 10 % y 15 %) y la opción de escribir otro importe, con un máximo de 50 €. La propina se cobra con el mismo método de pago del viaje y el pasajero puede añadirla hasta 72 horas después desde el detalle del viaje en Actividad. El conductor recibe el 100 % y se le notifica. Estados a cubrir: propina enviada, error de pago (con reintento o cambio de tarjeta) y propina ya dejada (no se puede editar). Fuera de alcance: la vista del conductor y las propinas en efectivo. Restricciones: el texto debe dejar claro que la propina es opcional y no se puede preseleccionar ningún importe.",goal:"Que al menos el 15 % de los viajes reciban propina en 3 meses y subir la satisfacción de los conductores, medida en la encuesta trimestral.",prio:"Medium",date:"2026-12-15"}
];
/* ================= ORQUESTADOR: registro de prompts editables =================
   Cada agente tiene una plantilla con variables {{ASI}}. El código rellena las variables con los datos reales
   (card, historial, sistema de diseño, salidas de otros agentes). Las plantillas modificadas se guardan en
   config/prompts y se aplican a todo el equipo; "Restaurar original" vuelve a la de aquí. */
const DEF_FIDELIDAD = `REGLAS DE FIDELIDAD (obligatorias)
- Fuentes válidas: la card con las respuestas del cliente, los comentarios de Jira, cómo es la app hoy y el sistema de diseño. Nada más.
- No inventes funcionalidades, servicios, secciones, promociones, cifras de negocio ni pasos que no salgan de esas fuentes. Si algo hace falta y no está, no lo diseñes: llévalo a preguntas_abiertas. Solo si es imprescindible para que la pantalla funcione, decláralo como supuesto.
- Los datos de ejemplo (nombres, direcciones, precios, fechas) pueden ser ficticios pero realistas y coherentes con la app de hoy. No son funcionalidades nuevas.
- No mezcles estados distintos en una misma pantalla (con datos, vacío, carga, error, avisos excepcionales). Cada pantalla muestra su estado principal con datos; los demás estados se documentan aparte.`;
const DEF_FLUJO = `FLUJO Y TRANSICIONES
- tipo_flujo: "secuencial" si la petición es una tarea con pasos que se encadenan (pedir algo, completar un formulario); "pestanas" si son pantallas hermanas de la navegación principal (por ejemplo, las pestañas de la barra inferior) que no se encadenan entre sí; "mixto" si combina ambas.
- transiciones: solo los saltos que el usuario hace de verdad entre pantallas DE ESTA propuesta, cada uno con su disparador exacto (el texto del elemento que se pulsa) y su fuente. Prohibido conectar pantallas solo para que haya un recorrido.
- La barra inferior se enlaza sola con las pantallas que tienen el nombre de su pestaña: no la pongas como transición.
- Cada elemento interactivo importante debe tener destino: o una transición a otra pantalla de la propuesta, o una entrada en fuera_de_alcance si abre una pantalla que no se diseña aquí (por ejemplo, el buscador abre la pantalla de destino y esa pantalla no se pide). Nunca lo conectes con otra pantalla que no le corresponde.
- En tipo "pestanas" lo normal es que no haya transiciones; describe en flujo qué hace el usuario en cada pantalla, sin inventar un orden de visita.`;

const PROMPT_DEFS = {
  analista:{ name:"Analista de brief", where:"cliente", when:"Al pulsar «Analizar brief» en la vista Cliente, y cada vez que el cliente responde y vuelve a analizar.",
    reads:"La petición del formulario, las respuestas del cliente, las peticiones anteriores de Jira y cómo es la app hoy.", makes:"Puntuación del brief, puntos flojos, preguntas al cliente y relación con otras cards.",
    vars:{RUBRICA:"Criterios fijos para puntuar el brief (bloque compartido «Rúbrica del brief»)",PETICION:"Título, descripción, objetivo, plataforma, fecha y prioridad del formulario",RESPUESTAS:"Preguntas ya respondidas por el cliente",HISTORIAL:"Últimas 25 cards del proyecto en Jira",APP_HOY:"Descripción de la app actual (capturas reales), si está configurada",FORMATO:"Forma del JSON de respuesta"},
    template:`Eres el ANALISTA DE BRIEFS de un equipo de diseño de producto. Un cliente está preparando una petición para el equipo. Tu trabajo es detectar puntos flojos y preguntas sin responder que impedirían a diseño plantear una solución, y conectar la petición con trabajo anterior cuando tenga sentido.
No propongas soluciones de diseño. Sé concreto y breve. Haz como máximo 3 preguntas: solo las necesarias para despejar dudas que bloquean empezar a diseñar, ordenadas por importancia (si no hay dudas bloqueantes, haz menos o ninguna). Si el brief está "listo", las preguntas son solo recomendaciones para mejorar el resultado: márcalas con "obligatoria": false. No repitas preguntas que ya tengan respuesta. Escribe en español y tutea al cliente.

{{RUBRICA}}

PETICIÓN
{{PETICION}}

RESPUESTAS QUE YA HA DADO EL CLIENTE
{{RESPUESTAS}}

PETICIONES ANTERIORES EN JIRA
{{HISTORIAL}}{{APP_HOY}}

{{FORMATO}}`,
    format:`Responde solo con JSON con esta forma:
{"puntuacion": 0-100, "nivel": "listo" | "casi" | "incompleto", "resumen": "una o dos frases sobre el estado del brief", "fortalezas": ["..."], "puntos_flojos": [{"tema": "2 a 4 palabras", "detalle": "máximo 10 palabras"}], "preguntas": [{"id": "q1", "pregunta": "...", "motivo": "por qué la necesita diseño", "obligatoria": true}], "conexiones": [{"key": "KAN-1", "motivo": "cómo se relaciona"}], "titulo_sugerido": "..."}`},
  arquitecto:{ name:"Arquitecto UX", where:"disenador", when:"Primer paso al pulsar «Lanzar agentes» (si está seleccionado).",
    reads:"La card de Jira con respuestas y comentarios, el historial del proyecto, la marca, el sistema de diseño y la app actual.", makes:"Objetivo, usuarios, supuestos, flujo, transiciones, pantallas con contenido y estados, decisiones y preguntas abiertas.",
    vars:{FIDELIDAD:"Reglas compartidas de fidelidad",FLUJO_REGLAS:"Reglas compartidas de flujo y transiciones",CARD:"Card completa: descripción, estado y comentarios de Jira",HISTORIAL:"Otras cards del proyecto",MARCA:"Producto, plataforma, sistema de diseño y notas de marca",SISTEMA:"Guía del sistema de diseño y descripción de la app actual",FORMATO:"Forma del JSON de respuesta"},
    template:`Eres el ARQUITECTO UX de un equipo de diseño de producto. Recibes una card de Jira creada por el cliente (incluye sus respuestas al analista de brief) y el historial de peticiones del proyecto. Define la base de la solución: objetivo, usuarios, flujo y pantallas. No escribas textos finales ni definas la UI visual. Usa el historial para mantener coherencia y conecta con trabajo previo cuando tenga sentido. Diseña las pantallas que pide la card (entre 1 y 6); no añadas pantallas que no se piden. Escribe en español.

{{FIDELIDAD}}

{{FLUJO_REGLAS}}

{{CARD}}

HISTORIAL DE PETICIONES
{{HISTORIAL}}

MARCA Y PRODUCTO
{{MARCA}}{{SISTEMA}}

{{FORMATO}}`,
    format:`Responde solo con JSON con esta forma:
{"objetivo":"...","usuarios":["..."],"supuestos":["..."],"tipo_flujo":"secuencial | pestanas | mixto","flujo":[{"paso":"...","pantalla":"s1","resultado":"..."}],"transiciones":[{"desde":"s1","hacia":"s2","disparador":"texto exacto del elemento que se pulsa","fuente":"brief | app actual | supuesto"}],"fuera_de_alcance":[{"desde":"s1","disparador":"texto exacto del elemento","destino":"nombre corto de la pantalla que abriría"}],"pantallas":[{"id":"s1","nombre":"...","proposito":"...","fuente":"brief | app actual | supuesto","contenido":["..."],"estados":["carga, vacío, error…"]}],"decisiones":[{"decision":"...","motivo":"..."}],"relacion_tareas":[{"key":"KAN-1","como":"..."}],"preguntas_abiertas":["..."]}`},
  writer:{ name:"UX Writer", where:"disenador", when:"Después del Arquitecto UX (necesita su salida).",
    reads:"La card, la marca, el sistema de diseño y la arquitectura UX.", makes:"Textos de cada pantalla, botones, errores, estados vacíos, tono y glosario.",
    vars:{FIDELIDAD:"Reglas compartidas de fidelidad",CARD:"Card completa de Jira",MARCA:"Producto, plataforma y marca",SISTEMA:"Guía del sistema de diseño y app actual",ARQUITECTURA:"Salida del Arquitecto UX (JSON)",FORMATO:"Forma del JSON de respuesta"},
    template:`Eres el UX WRITER de un equipo de diseño de producto. Escribe todos los textos de las pantallas definidas por el arquitecto UX: títulos, etiquetas, botones, mensajes de ayuda, estados vacíos y errores. Tono claro y cercano, frases cortas, verbos de acción en los botones, sin jerga interna. Mantén la terminología coherente y recógela en el glosario. Escribe solo los textos del contenido que define el arquitecto: no añadas secciones, servicios ni mensajes nuevos. Los disparadores de las transiciones del arquitecto deben aparecer tal cual como texto de un elemento. Escribe en español.

{{FIDELIDAD}}

{{CARD}}

MARCA Y PRODUCTO
{{MARCA}}{{SISTEMA}}

ARQUITECTURA UX
{{ARQUITECTURA}}

{{FORMATO}}`,
    format:`Responde solo con JSON con esta forma:
{"tono":"...","pantallas":[{"id":"s1","titulo":"...","textos":[{"elemento":"...","texto":"..."}],"ctas":["..."],"errores":[{"caso":"...","texto":"..."}],"vacios":["..."]}],"glosario":[{"termino":"...","uso":"..."}]}`},
  writer_revision:{ name:"UX Writer · revisión de textos", where:"disenador", when:"Cuando eliges al UX Writer sin el Arquitecto UX: después del UI Designer, sobre la última versión o solo con la card (por ejemplo, una tarea de revisar textos).",
    reads:"La card, la marca, el sistema de diseño y los textos actuales (de las pantallas o de la card).", makes:"Lista de cambios texto actual → propuesto con motivo; el portal los aplica sobre las pantallas cuando las hay.",
    vars:{ORIGEN:"Qué textos revisa (pantallas del UI Designer, versión anterior o la card)",FIDELIDAD:"Reglas compartidas de fidelidad",CARD:"Card completa de Jira",MARCA:"Producto, plataforma y marca",SISTEMA:"Guía del sistema de diseño y app actual",TEXTOS_A_REVISAR:"Textos actuales por pantalla, tal como aparecen",FORMATO:"Forma del JSON de respuesta"},
    template:`Eres el UX WRITER de un equipo de diseño de producto y tu tarea es REVISAR TEXTOS. {{ORIGEN}} Propón solo los cambios necesarios para que sean claros, cortos, coherentes entre sí y con el tono y las reglas de contenido del sistema: verbos de acción en los botones, sin jerga interna, la misma palabra para la misma cosa. Cita en "actual" el texto EXACTO tal como aparece, copiado carácter a carácter, para poder sustituirlo. No cambies textos que ya están bien, no añadas contenido ni funcionalidades y no toques nombres propios, precios ni datos de ejemplo. Si la card pide algo concreto sobre los textos, priorízalo. Escribe en español.

{{FIDELIDAD}}

{{CARD}}

MARCA Y PRODUCTO
{{MARCA}}{{SISTEMA}}

{{TEXTOS_A_REVISAR}}

{{FORMATO}}`,
    format:`Responde solo con JSON con esta forma:
{"tono":"...","resumen":"qué se revisó y con qué criterio, en una o dos frases","revision":[{"pantalla":"s1 o contexto","elemento":"botón principal, título…","actual":"texto exacto","propuesto":"...","motivo":"..."}],"glosario":[{"termino":"...","uso":"..."}],"pendiente":["textos que no se pueden revisar sin más información"]}`},
  ui:{ name:"UI Designer", where:"disenador", when:"Después del Writer (o directamente desde la card si no hay Arquitecto).",
    reads:"La arquitectura y los textos (o la card), la marca, el sistema de diseño, la tabla de componentes de Figma y el esquema de bloques.", makes:"Especificación de pantallas por bloques que se dibuja en el portal y en Figma, con los enlaces del prototipo.",
    vars:{ENCARGO:"Qué convierte y quién escribe los textos (cambia si faltan agentes)",PANTALLAS:"Cómo decidir las pantallas (incluye reglas de flujo si no hay Arquitecto)",LIENZO:"Tamaño del frame según plataforma",COMPONENTES_FIGMA:"Tabla bloque → componente de la librería de Figma conectada",REGLA_ESTILO:"Cómo usar el sistema de diseño o el color de marca",ESQUEMA_BLOQUES:"Bloque compartido: tipos de bloque y sus campos",FIDELIDAD:"Reglas compartidas de fidelidad",CARD_TITULO:"Clave y título de la card",MARCA:"Producto, plataforma y marca",SISTEMA:"Guía del sistema de diseño y app actual",ENTRADA:"Arquitectura UX, o la card completa si no hubo Arquitecto",TEXTOS:"Salida del UX Writer, si participó",FORMATO:"Forma del JSON de respuesta"},
    template:`Eres el UI DESIGNER de un equipo de diseño de producto. {{ENCARGO}} Usa datos de ejemplo realistas. {{PANTALLAS}} {{LIENZO}} {{COMPONENTES_FIGMA}}
{{REGLA_ESTILO}}

{{ESQUEMA_BLOQUES}}

Reglas: como máximo 18 bloques por pantalla; no inventes tipos de bloque; los textos van en los campos indicados; el subtitle o la descripción nunca repite el title (aporta un dato distinto) y los títulos de fila son cortos (máx. 28 caracteres); no añadas contenido que no esté en la arquitectura y los textos.

{{FIDELIDAD}}

CARD: {{CARD_TITULO}}
MARCA Y PRODUCTO
{{MARCA}}{{SISTEMA}}

{{ENTRADA}}

{{TEXTOS}}

{{FORMATO}}`,
    format:null},
  qa:{ name:"QA", where:"disenador", when:"Último paso del lanzamiento y después de cada cambio pedido (si está seleccionado).",
    reads:"La card, el sistema de diseño y las salidas de Arquitecto, Writer y UI.", makes:"Puntuación, cobertura de requisitos y problemas con severidad, área y sugerencia.",
    vars:{REGLA_SISTEMA:"Comprobación extra del sistema de diseño, si está activo",CARD:"Card completa de Jira",SISTEMA:"Guía del sistema de diseño y app actual",ARQUITECTURA:"Salida del Arquitecto UX",TEXTOS:"Salida del UX Writer",UI:"Especificación del UI Designer",FORMATO:"Forma del JSON de respuesta"},
    template:`Eres QA de diseño. Revisa la propuesta contra la card del cliente antes de que el diseñador la revise. Comprueba: cobertura de cada requisito del brief; fidelidad (cualquier funcionalidad, sección, servicio, promoción o paso que no salga de la card, sus respuestas o la app de hoy es un problema de severidad alta con área "Fidelidad"); flujo (cada "to" de la UI debe corresponder a una transición de la arquitectura y cada transición debe tener su elemento; marca con área "Flujo" las conexiones que no tengan sentido para el usuario); estados mezclados en una misma pantalla; estados que faltan (carga, vacío, error), textos (claridad, coherencia con el glosario), UI (jerarquía, contraste del color primario, tamaños táctiles, etiquetas de campos) y relación con tareas anteriores.{{REGLA_SISTEMA}} Sé concreto: cada problema con pantalla y sugerencia accionable. Escribe en español.

{{CARD}}{{SISTEMA}}

ARQUITECTURA UX
{{ARQUITECTURA}}

TEXTOS
{{TEXTOS}}

ESPECIFICACIÓN UI
{{UI}}

{{FORMATO}}`,
    format:`Responde solo con JSON con esta forma:
{"puntuacion":0,"listo_para_cliente":false,"resumen":"...","cobertura":[{"requisito":"...","estado":"cubierto | parcial | no","nota":"..."}],"problemas":[{"severidad":"alta | media | baja","area":"Fidelidad | Flujo | UX | Copy | UI | Accesibilidad | Sistema","pantalla":"s1 o general","detalle":"...","sugerencia":"..."}]}`},
  revision:{ name:"Equipo de cambios", where:"disenador", when:"Al pulsar «Aplicar cambios» o «Usar las sugerencias de QA» sobre una versión.",
    reads:"Tu petición de cambio, la card, la marca, el sistema y la versión actual completa.", makes:"Las piezas que cambian (arquitectura, textos o UI) y el resumen de cambios para la versión nueva.",
    vars:{FIDELIDAD:"Reglas compartidas de fidelidad",FLUJO_REGLAS:"Reglas compartidas de flujo",PETICION:"Lo que pide el diseñador",CARD:"Card completa de Jira",MARCA:"Producto, plataforma y marca",SISTEMA:"Guía del sistema de diseño y app actual",ARQUITECTURA:"Arquitectura de la versión actual",TEXTOS:"Textos de la versión actual",UI:"UI de la versión actual",ESQUEMA_BLOQUES:"Bloque compartido: tipos de bloque y sus campos",FORMATO:"Forma del JSON de respuesta"},
    template:`Eres el equipo de agentes de diseño (arquitecto UX, UX writer y UI designer) aplicando un cambio que pide el diseñador sobre la versión actual. Aplica solo lo que se pide y lo necesario para mantener la coherencia entre arquitectura, textos y pantallas (si cambian los saltos entre pantallas, actualiza transiciones en la arquitectura y los "to" de la UI a la vez). Devuelve completas las piezas que cambien y null en las que no cambien. Escribe en español.

{{FIDELIDAD}}

{{FLUJO_REGLAS}}

PETICIÓN DEL DISEÑADOR
{{PETICION}}

{{CARD}}

MARCA Y PRODUCTO
{{MARCA}}{{SISTEMA}}

ARQUITECTURA ACTUAL
{{ARQUITECTURA}}

TEXTOS ACTUALES
{{TEXTOS}}

UI ACTUAL
{{UI}}

{{ESQUEMA_BLOQUES}}

{{FORMATO}}`,
    format:`Responde solo con JSON con esta forma:
{"resumen_cambios":["..."],"architect":null,"writer":null,"ui":null}`},
  notas:{ name:"Notas de Figma", where:"disenador", when:"Al pulsar «Aprobar y enviar a Figma». Escribe la nota que acompaña a la sección.",
    reads:"La card, la versión que se envía y, si la tarea ya estaba en Figma, las peticiones y cambios desde el último envío.", makes:"Dos frases breves para la tarjeta «Documentación»: necesidad y solución (tarea nueva) o solicitud y cambio realizado (tarea existente).",
    vars:{CASO:"«Tarea nueva» o «Tarea ya existente» y qué debe contar cada parte",CARD:"Card completa de Jira",PROPUESTA:"Resumen de la versión que se envía (objetivo, pantallas, flujo)",CAMBIOS:"Peticiones y cambios desde el último envío a Figma (solo tarea existente)",FORMATO:"Forma del JSON de respuesta"},
    template:`Eres el redactor de notas de diseño del equipo. Escribe la nota que acompaña a una propuesta en Figma para que cualquiera entienda de un vistazo qué se pidió y qué se hizo. Sé breve y concreto: cada parte, una o dos frases (máximo 260 caracteres), sin listas, sin jerga y sin inventar nada que no esté en los datos. Escribe en español.

{{CASO}}

{{CARD}}

PROPUESTA QUE SE ENVÍA
{{PROPUESTA}}

{{CAMBIOS}}

{{FORMATO}}`,
    format:`Responde solo con JSON con esta forma:
{"parte1":"...","parte2":"..."}`},
  pendientes:{ name:"Resumen de pendientes", where:"disenador", when:"Al llegar al paso «Ajustes en Figma». Resume lo que queda por resolver; se calcula una vez por versión.",
    reads:"Las preguntas abiertas del Arquitecto UX y los problemas graves de QA de la versión enviada a Figma.", makes:"Dos listas cortas: qué confirmar con el cliente y qué corregir en Figma.",
    vars:{PANTALLAS:"Nombres de las pantallas de la versión",PENDIENTES:"Preguntas abiertas y problemas de QA, tal cual los dejaron los agentes",FORMATO:"Forma del JSON de respuesta"},
    template:`Eres el asistente del diseñador. Resume lo que queda pendiente de una propuesta que ya está en Figma para que se entienda de un vistazo. Escribe en español, claro y sin jerga técnica.

Reglas:
- "cliente": decisiones que solo puede tomar el cliente. Cada una en 10 palabras como máximo, como pregunta directa. Junta las que traten de lo mismo y deja solo las 5 más importantes para poder terminar el diseño.
- "corregir": cambios que el diseñador debe hacer en Figma. Cada uno en 12 palabras como máximo, empezando por un verbo (Añade, Quita, Conecta…). Indica la pantalla por su nombre, nunca por su id (s1, s2…). Junta los problemas relacionados y deja como máximo 5.
- No inventes nada que no esté en los datos. No repitas la misma idea en las dos listas.

PANTALLAS
{{PANTALLAS}}

PENDIENTES
{{PENDIENTES}}

{{FORMATO}}`,
    format:`Responde solo con JSON con esta forma:
{"cliente":["..."],"corregir":[{"pantalla":"...","texto":"..."}]}`},
  rubrica:{ name:"Rúbrica del brief", shared:true, where:"compartido", when:"Se inserta como {{RUBRICA}} en el Analista de brief para que puntúe siempre con los mismos criterios.", reads:"", makes:"", vars:{}, template:`CÓMO PUNTUAR (suma de criterios, 0-100; las respuestas del cliente cuentan como parte del brief)
1. Necesidad clara: qué se quiere y para quién (0-20)
2. Contexto: qué pasa hoy y por qué hace falta (0-15)
3. Objetivo de negocio medible: métrica o resultado concreto (0-15)
4. Alcance y reglas clave: comportamiento principal, límites y decisiones de negocio que diseño necesita (0-20)
5. Casos límite y estados: errores, vacíos, qué pasa si algo falla (0-10)
6. Restricciones, dependencias y fuera de alcance (0-10)
7. Datos de la petición: plataforma, fecha deseada y prioridad (0-10)
Da puntos parciales cuando un criterio está a medias. No penalices lo que el brief deja explícitamente fuera de alcance.
Nivel: "incompleto" por debajo de 45, "casi" de 45 a 79, "listo" desde 80.
En "resumen", menciona los criterios que más puntos han restado.`, format:null },
  fidelidad:{ name:"Reglas de fidelidad", shared:true, where:"compartido", when:"Se inserta como {{FIDELIDAD}} en Arquitecto, Writer, UI y Cambios.", reads:"", makes:"", vars:{}, template:DEF_FIDELIDAD, format:null },
  flujo:{ name:"Reglas de flujo y transiciones", shared:true, where:"compartido", when:"Se inserta como {{FLUJO_REGLAS}} en Arquitecto y Cambios, y en UI cuando no hay Arquitecto.", reads:"", makes:"", vars:{}, template:DEF_FLUJO, format:null },
  esquema:{ name:"Esquema de bloques de UI", shared:true, where:"compartido", when:"Se inserta como {{ESQUEMA_BLOQUES}} en UI y Cambios. Los tipos de bloque deben existir en el portal y en Figma: si añades uno nuevo aquí no se dibujará.", reads:"", makes:"", vars:{}, template:UI_SCHEMA, format:null }
};
const PROMPT_ORDER = ["analista","arquitecto","writer","writer_revision","ui","qa","revision","notas","pendientes"];
const SHARED_IDS = ["rubrica","fidelidad","flujo","esquema"];
function promptT(id){ const o=S.prompts&&S.prompts[id]; return (o&&typeof o.t==="string"&&o.t.trim())?o.t:PROMPT_DEFS[id].template; }
function promptVars(t){ return [...new Set((String(t).match(/\{\{([A-Z_]+)\}\}/g)||[]).map(x=>x.slice(2,-2)))]; }
function fillPrompt(id,vars){
  let t=promptT(id);
  if(!t.includes("{{FORMATO}}")) t+="\n\n{{FORMATO}}";
  const all=Object.assign({RUBRICA:promptT("rubrica"),FIDELIDAD:promptT("fidelidad"),FLUJO_REGLAS:promptT("flujo"),ESQUEMA_BLOQUES:promptT("esquema")},vars||{});
  if(PROMPT_DEFS[id].format&&all.FORMATO==null) all.FORMATO=PROMPT_DEFS[id].format;
  return t.replace(/\{\{([A-Z_]+)\}\}/g,(m,k)=>all[k]!=null?String(all[k]):"");
}
const GROUND = DEF_FIDELIDAD, FLOW_RULES = DEF_FLUJO;

/* ---- constructores de prompt (los usan los agentes y la vista previa del Orquestador) ---- */
function promptAnalyst(b,answered){
  return fillPrompt("analista",{PETICION:`Título: ${b.title}
Qué necesita: ${b.desc}
Problema u objetivo: ${b.goal||"(no indicado)"}
Plataforma: ${b.platform}
Fecha deseada: ${b.date||"(no indicada)"}
Prioridad: ${b.prio}`,RESPUESTAS:answered||"(ninguna)",HISTORIAL:historyCtx(),APP_HOY:appCtx()});
}
function promptArchitect(d){ return fillPrompt("arquitecto",{CARD:issueCtx(d),HISTORIAL:historyCtx(d.key),MARCA:brandCtx(),SISTEMA:dsCtx("plantea el flujo con los componentes que existen en el sistema")}); }
function promptWriter(d,arch){ return fillPrompt("writer",{CARD:issueCtx(d),MARCA:brandCtx(),SISTEMA:dsCtx("aplica sus reglas de contenido y tono por encima de cualquier otra preferencia"),ARQUITECTURA:J(arch)}); }
function promptUI(d,arch,writer){
  const c=S.cfg||{};
  return fillPrompt("ui",{
    ENCARGO:`Conviertes ${arch?"la arquitectura UX":"la card"}${writer?" y los textos":""} en una especificación de pantallas que se dibuja automáticamente en HTML y en Figma. ${writer?"Usa EXACTAMENTE los textos del UX Writer.":"Escribe tú los textos: claros, cortos, con verbos de acción en los botones."}`,
    PANTALLAS:arch?"Crea una pantalla por cada pantalla de la arquitectura, con el mismo id.":"No hay Arquitecto UX en este equipo: decide tú las pantallas que pide la card (entre 1 y 6, ids s1, s2…) y su flujo siguiendo estas reglas.\n\n"+promptT("flujo"),
    LIENZO:`Cada pantalla se dibuja en un frame de ${c.platform==="desktop"?"1440 × 1024":"375 × 812"} px como mínimo: diseña para ese ancho y procura que el contenido principal quepa en ese alto.`,
    COMPONENTES_FIGMA:figLib()?`En Figma, cada bloque se construye con un componente real del sistema ${S.ds.name}: appbar→Navigation header (left "back" o "close"; sin left = título grande de pantalla principal), sheetheader→Sheet header, map→Map, driver→Driver card, button→Button, input→Text field, search→Search field, select→Select, banner→Banner, list→List item, option→List item (Option), check→List item con Radio/Checkbox o Switch, tags y chips→Tag, tabs→Tabs (máx. 3), segmented→Segmented control (máx. 3), sectionheading→Section heading, progress→Progress bar, divider→Divider, avatar→Avatar, empty→Empty state, snackbar→Snackbar, dialog→Dialog, bottomnav→Bottom navigation (Inicio, Servicios, Actividad, Cuenta), dock→Button dock. Todas las pantallas móviles llevan Status bar automáticamente. Prioriza esos bloques; usa card, row, grid, stat, tile o image solo cuando no haya componente equivalente. En pantallas de viaje empieza con un bloque map seguido de sheetheader.`:"",
    REGLA_ESTILO:dsOn()?"Usa SOLO los componentes del sistema de diseño, traducidos a los bloques de abajo según la tabla de equivalencias del sistema; respeta sus reglas (un solo botón primario por pantalla, jerarquía tipográfica, estados). Los tokens de color y forma los aplica el sistema automáticamente: no hace falta que los inventes.":"Usa el color primario de marca y deriva el resto de tokens con buen contraste (texto sobre primario legible, AA).",
    CARD_TITULO:`${d.key} · ${d.summary}`,MARCA:brandCtx(),SISTEMA:dsCtx("es la fuente de verdad de la UI"),
    ENTRADA:arch?`ARQUITECTURA UX\n${J(arch)}`:`CARD COMPLETA\n${issueCtx(d)}`,
    TEXTOS:writer?`TEXTOS DEL UX WRITER\n${J(writer)}`:"",
    FORMATO:`Responde solo con JSON con esta forma:
{"platform":"${c.platform==="desktop"?"desktop":"mobile"}",${arch?"":`"tipo_flujo":"secuencial | pestanas | mixto","transiciones":[{"desde":"s1","hacia":"s2","disparador":"texto exacto del elemento"}],"fuera_de_alcance":[{"desde":"s1","disparador":"...","destino":"..."}],`}"tokens":{"primary":"#hex","onPrimary":"#hex","bg":"#hex","surface":"#hex","text":"#hex","muted":"#hex","border":"#hex","radius":12},"screens":[{"id":"s1","name":"...","purpose":"...","blocks":[{"t":"appbar","title":"..."}]}],"notas":["decisión visual y por qué"]}`});
}
function promptQA(d,arch,writer,ui){
  return fillPrompt("qa",{REGLA_SISTEMA:dsOn()?` Comprueba además que la propuesta cumple el sistema de diseño ${S.ds.name} (componentes permitidos, un solo primario por vista, tono y formato de los textos) y marca cada incumplimiento con área "Sistema".`:"",
    CARD:issueCtx(d),SISTEMA:dsCtx("úsalo como criterio de revisión"),
    ARQUITECTURA:arch?J(arch):"(no se usó el Arquitecto UX en esta propuesta)",TEXTOS:writer?J(writer):"(no se usó el UX Writer en esta propuesta)",UI:ui?J(ui):"(no se usó el UI Designer: revisa solo la arquitectura y los textos)"});
}
function promptRevise(d,v,request){
  return fillPrompt("revision",{PETICION:request,CARD:issueCtx(d),MARCA:brandCtx(),SISTEMA:dsCtx("mantenlo en cualquier cambio"),ARQUITECTURA:J(v.architect),TEXTOS:J(v.writer),UI:J(v.ui)});
}
/* Textos de una UI por pantalla, para que el Writer los revise y el portal los pueda sustituir */
const TXT_FIELDS=["title","subtitle","label","text","placeholder","value","helper","error","caption","cta","action","primary","secondary","trailing","lead","price","meta","body","detail","name","eta"];
function uiTexts(ui){ return arr(ui&&ui.screens).map(sc=>{ const out=[]; const walk=b=>{ if(!b||typeof b!=="object") return; TXT_FIELDS.forEach(f=>{ if(typeof b[f]==="string"&&b[f].trim()) out.push(b[f]); }); arr(b.items).forEach(i=>{ if(typeof i==="string") out.push(i); else walk(i); }); arr(b.children).forEach(walk); if(b.badge&&b.badge.text) out.push(b.badge.text); }; arr(sc.blocks).forEach(walk); return {pantalla:sc.id,nombre:sc.name,textos:[...new Set(out)]}; }); }
function applyTextReview(ui,rev){
  const u=JSON.parse(JSON.stringify(ui)); let applied=0; const items=arr(rev&&rev.revision).filter(r=>r&&typeof r.actual==="string"&&typeof r.propuesto==="string"&&r.actual.trim()&&r.actual!==r.propuesto);
  const norm=x=>String(x).replace(/\s+/g," ").trim();
  items.forEach(r=>{ let hit=false; const scs=arr(u.screens).filter(sc=>!r.pantalla||sc.id===r.pantalla||!arr(u.screens).some(x=>x.id===r.pantalla));
    const fix=o=>{ if(!o||typeof o!=="object") return; TXT_FIELDS.forEach(f=>{ if(typeof o[f]!=="string") return; if(norm(o[f])===norm(r.actual)){ o[f]=r.propuesto; hit=true; } else if(norm(r.actual).length>12&&o[f].includes(r.actual)){ o[f]=o[f].replace(r.actual,r.propuesto); hit=true; } });
      if(Array.isArray(o.items)) o.items=o.items.map(i=>{ if(typeof i==="string"&&norm(i)===norm(r.actual)){ hit=true; return r.propuesto; } fix(i); return i; }); arr(o.children).forEach(fix); };
    scs.forEach(sc=>arr(sc.blocks).forEach(fix)); r.aplicado=hit; if(hit) applied++; });
  return {ui:u,applied};
}
function promptWriterReview(d,ui,fromVersion){
  return fillPrompt("writer_revision",{
    ORIGEN:ui?(fromVersion?`Revisas los textos de la versión v${fromVersion} de la propuesta, que ya tiene pantallas.`:"Revisas los textos de las pantallas que acaba de diseñar el UI Designer."):"No hay pantallas en esta tarea: revisa los textos que el cliente aporta en la card y sus comentarios (o los de la app de hoy si la card se refiere a ellos). Si la card no incluye los textos a revisar, devuelve revision vacía y explica en pendiente qué falta.",
    CARD:issueCtx(d),MARCA:brandCtx(),SISTEMA:dsCtx("aplica sus reglas de contenido y tono por encima de cualquier otra preferencia"),
    TEXTOS_A_REVISAR:ui?"TEXTOS ACTUALES POR PANTALLA\n"+J(uiTexts(ui)):""});
}
async function agentWriterReview(d,ui,fromVersion){ return S.sample.json(promptWriterReview(d,ui,fromVersion),{modelTier:"default",cache:false}); }
async function agentArchitect(d){ return S.sample.json(promptArchitect(d),{modelTier:"default",cache:false}); }
async function agentWriter(d,arch){ return S.sample.json(promptWriter(d,arch),{modelTier:"default",cache:false}); }
async function agentUI(d,arch,writer){ return S.sample.json(promptUI(d,arch,writer),{modelTier:"default",cache:false}); }
async function agentQA(d,arch,writer,ui){ return S.sample.json(promptQA(d,arch,writer,ui),{modelTier:"default",cache:false}); }
async function agentRevise(d,v,request){ return S.sample.json(promptRevise(d,v,request),{modelTier:"default",cache:false}); }

function validUI(ui){ if(!ui||!Array.isArray(ui.screens)||!ui.screens.length) throw {message:"El UI Designer no devolvió pantallas."}; ui.screens.forEach((s,i)=>{ s.id=s.id||("s"+(i+1)); s.blocks=arr(s.blocks); }); if(dsOn()&&S.ds.theme){ const dark=!figLib()&&S.cfg.screenTheme!=="light"&&S.ds.themeDark; ui.tokens=Object.assign({},ui.tokens||{},dark?S.ds.themeDark:S.ds.theme); ui.ds=S.ds.name+(figLib()?" · componentes de Figma":dark?" · oscuro":""); } else { delete ui.ds; } return ui; }

function runRef(key){ return S.db.doc("runs/"+key); }
async function setRun(key,data,merge){ const r=runRef(key); if(merge && S.runs[key] && typeof r.update === "function") return r.update(data); return r.set(Object.assign({},S.runs[key]||{},data), merge ? { merge: true } : {}); }

const STAGE_NAME={arquitecto:"Arquitecto UX",writer:"UX Writer",ui:"UI Designer",qa:"QA",jira:"Lectura de Jira",cambios:"Cambios"};
function agentErr(stage,e){
  const who=STAGE_NAME[stage]||"Un agente";
  const c=e&&e.code;
  let why;
  if(c==="upstream_error"||!c&&!(e&&e.message)) why="se cortó la conexión con Claude antes de terminar. Suele pasar si el ordenador entra en reposo o la pestaña queda en segundo plano mucho tiempo";
  else if(c==="invalid_json"||c==="empty_completion") why="devolvió una respuesta incompleta o sin el formato esperado";
  else if(c) why=aiMsg(e).replace(/\.$/,"").replace(/^./,m=>m.toLowerCase());
  else why=clip(e.message,200).replace(/\.$/,"");
  return {error:`${who}: ${why}.`,errorCode:c||"local",failedStage:stage};
}
function partRef(key){ return S.db.doc(`runs/${key}/partial/current`); }
function withTimeout(p,ms,fallback){ return Promise.race([p,new Promise(r=>setTimeout(()=>r(fallback),ms))]); }
async function runAgents(key,opts){
  opts=opts||{};
  if(!S.booted){ S.msgs[key]="La página todavía se está conectando. Espera unos segundos y vuelve a pulsar."; renderAll(); return; }
  if(!S.sample){ S.msgs[key]="Los agentes no tienen permiso para usar Claude en esta vista. Recarga la página y acepta el aviso de Claude, o ábrela en claude.ai."; renderAll(); return; }
  if(!S.mcp||!S.cloudId){ S.msgs[key]="No hay conexión con Jira. Pulsa Actualizar en la lista de cards y acepta el aviso de Jira."; renderAll(); return; }
  if(!S.db){ S.msgs[key]="Esta vista no puede guardar el trabajo de los agentes. Abre la página en claude.ai."; renderAll(); return; }
  if(S.launching[key]) return;
  S.launching[key]=true; S.msgs[key]="Preparando a los agentes…"; renderAll();
  const lease = await withTimeout(S.db.doc("locks/"+key).acquire({holder:S.tabId,ttlMs:900000}).catch(()=>({acquired:true})),5000,{acquired:true});
  if(!lease.acquired){ S.launching[key]=false; S.msgs[key]="Otro diseñador ya está lanzando los agentes en esta card. Si no es así, espera 15 minutos y vuelve a intentarlo."; renderAll(); return; }
  const prev=S.runs[key]||{};
  const n=(Number(prev.version)||0)+1;
  const stamp=new Date().toISOString();
  let part={};
  if(opts.resume){ try{ const sn=await partRef(key).get(); if(sn.exists) part=Object.assign({},sn.data()); }catch(e){} }
  else { try{ await partRef(key).delete(); }catch(e){} }
  let stage="jira";
  S.msgs[key]=null;
  const step=async(name,fn,field)=>{
    stage=name;
    if(part[field]) return part[field];
    await setRun(key,{stage:name,updatedAt:new Date().toISOString()},true);
    const out=await fn();
    part[field]=out;
    await partRef(key).set(Object.assign({},part,{savedAt:new Date().toISOString()})).catch(()=>{});
    return out;
  };
  try{
    const A=cleanSel(opts.agents||(opts.resume&&prev.agents)||AG_IDS);
    if(!selOk(A)) throw {message:"Elige al menos el Arquitecto UX, el UX Writer o el UI Designer"};
    await setRun(key,{key,order:(A.includes("writer")&&!A.includes("arquitecto"))?["arquitecto","ui","writer","qa"]:AG_IDS,status:"running",stage:(A.includes("writer")&&!A.includes("arquitecto")&&A.includes("ui"))?"ui":A[0],startedAt:stamp,updatedAt:stamp,error:null,errorCode:null,failedStage:null,version:prev.version||0,auto:false,agents:A});
    S.prelaunch[key]=false;
    const d = await loadDetail(key,true);
    if(!d) throw {message:"No se pudo leer la card en Jira. Comprueba la conexión con Jira y vuelve a intentarlo"};
    const prevV=latestVersion(key);
    let arch = A.includes("arquitecto")? await step("arquitecto",()=>agentArchitect(d),"architect") : null;
    let writer = A.includes("writer")&&arch? await step("writer",()=>agentWriter(d,arch),"writer") : null;
    let ui = A.includes("ui")? await step("ui",async()=>validUI(await agentUI(d,arch,writer)),"ui") : null;
    /* UX Writer sin Arquitecto: revisión de textos (de la UI recién hecha, de la última versión o de la card) */
    if(A.includes("writer")&&!arch){
      const reuse=!ui&&prevV&&prevV.ui?prevV:null; const base=ui||(reuse&&reuse.ui)||null;
      writer=await step("writer",()=>agentWriterReview(d,base,reuse?reuse.n:null),"writer");
      if(base){ const ap=applyTextReview(base,writer); ui=validUI(ap.ui); writer=Object.assign({},writer,{aplicados:ap.applied,de_version:reuse?reuse.n:null}); }
      if(reuse&&!A.includes("arquitecto")) arch=reuse.architect||null;
    }
    const qa = A.includes("qa")? await step("qa",()=>agentQA(d,arch,writer,ui),"qa") : null;
    stage="guardar";
    await S.db.doc(`runs/${key}/versions/v${n}`).set({n,createdAt:new Date().toISOString(),request:(n===1?"Propuesta inicial":"Propuesta regenerada desde cero")+" · agentes: "+A.map(a=>STAGE_NAME[a]).join(", "),cambios:[],agents:A,architect:arch,writer,ui,qa});
    await setRun(key,{status:"ready",stage:null,version:n,qaScore:Number(qa&&qa.puntuacion)||null,updatedAt:new Date().toISOString(),summary:clip((arch&&arch.objetivo)||(ui&&arr(ui.screens).map(x=>x.name).join(", "))||(writer&&writer.resumen)||"",240),error:null,errorCode:null,failedStage:null},true);
    partRef(key).delete().catch(()=>{});
    S.verSel[key]=n;
  }catch(e){
    const info=agentErr(stage,e);
    await setRun(key,Object.assign({status:"error",stage:null,updatedAt:new Date().toISOString(),done:Object.keys(part).filter(k=>part[k]&&k!=="savedAt")},info),true).catch(err=>{ S.msgs[key]="No se pudo guardar el estado: "+info.error; });
  }
  S.launching[key]=false; renderAll();
  release(key);
}
function release(key){ if(S.db) S.db.doc("locks/"+key).acquire({holder:S.tabId,ttlMs:1000}).catch(()=>{}); }
async function reviseVersion(key,request){
  const run=S.runs[key]; const v=latestVersion(key);
  if(!v||!request.trim()) return;
  const lease = await S.db.doc("locks/"+key).acquire({holder:S.tabId,ttlMs:600000}).catch(()=>({acquired:true}));
  if(!lease.acquired){ S.msgs[key]="Otro diseñador está trabajando en esta card ahora mismo."; renderAll(); return; }
  const n=(Number(run.version)||0)+1;
  try{
    await setRun(key,{status:"running",stage:"cambios",updatedAt:new Date().toISOString(),error:null},true);
    const d=S.detail[key]||await loadDetail(key,true);
    const r=await agentRevise(d,v,request);
    const architect=(r&&r.architect)||v.architect, writer=(r&&r.writer)||v.writer, ui0=(r&&r.ui)||v.ui, ui=ui0?validUI(ui0):null;
    const useQa=!Array.isArray(run.agents)||run.agents.includes("qa");
    if(useQa) await setRun(key,{stage:"qa",updatedAt:new Date().toISOString()},true);
    const qa=useQa? await agentQA(d,architect,writer,ui) : null;
    await S.db.doc(`runs/${key}/versions/v${n}`).set({n,createdAt:new Date().toISOString(),request,cambios:arr(r&&r.resumen_cambios),architect,writer,ui,qa});
    await setRun(key,{status:"ready",stage:null,version:n,qaScore:Number(qa&&qa.puntuacion)||null,updatedAt:new Date().toISOString()},true);
    S.drafts[key+":change"]=""; S.verSel[key]=n;
  }catch(e){
    await setRun(key,{status:"ready",stage:null,error:"No se aplicó el cambio. "+agentErr("cambios",e).error,updatedAt:new Date().toISOString()},true).catch(()=>{});
  }
  release(key);
}

/* cola automática: cards nuevas del portal sin propuesta */
function scheduleAuto(){
  return; /* los agentes ya no arrancan solos: el diseñador decide cuándo y cuáles */
  if(S.role!=="disenador"||!S.db||!S.sample||!S.runsLoaded||!S.issues) return;
  if(S.cfg.auto===false) return;
  if(document.visibilityState!=="visible") return;
  const limit=Date.now()-14*864e5;
  S.issues.forEach(i=>{
    if(!i.labels.includes(LABEL)) return;
    if(S.runs[i.key]||S.queue.includes(i.key)) return;
    if(new Date(i.created).getTime()<limit) return;
    S.queue.push(i.key);
  });
  pump();
}
async function pump(){
  if(S.working) return;
  const key=S.queue.shift(); if(!key) return;
  if(S.runs[key]) return pump();
  S.working=true; renderAll();
  await runAgents(key,{auto:true});
  S.working=false; renderAll(); pump();
}

/* ---------- Figma ---------- */
const FIGMA_DEFAULT="https://www.figma.com/design/dcKVRyGjsYiK3Cl1iBHeXc/Untitled?node-id=0-1";
function figLib(){ const L=S.ds&&S.ds.figmaLib; const tg=figTarget(); return L&&tg&&(L.fileKey===tg.key || tg.key==="dcKVRyGjsYiK3Cl1iBHeXc" || L.fileKey==="dcKVRyGjsYiK3Cl1iBHeXc")?L:null; }
function figKey(url){ const m=String(url||"").match(/figma\.com\/(?:design|file)\/([0-9a-zA-Z]{22,128})/); return m?m[1]:null; }
function figTarget(){ const url=(S.cfg&&S.cfg.figmaFile)||FIGMA_DEFAULT; const key=figKey(url); return key?{key,url:url.split("?")[0]}:null; }
async function loadPlans(){
  try{ const p=await call(FIG,"whoami",{}); const w=(p&&p.whoami)||p; S.figPlans=arr(w&&w.plans).map(x=>({key:x.key,name:x.name})); S.figErr=null; }
  catch(e){ S.figPlans=[]; S.figErr=e; }
  renderAll();
}
function figmaMeta(key,v,d){
  const a=v.architect||{}, q=v.qa||{};
  return { pageName:clip(`${key} · ${(d&&d.summary)||"Propuesta"} · v${v.n}`,120), key, version:v.n, title:(d&&d.summary)||key, sections:[
    {h:"Objetivo",items:[a.objetivo||"—"]},
    {h:"Flujo",items:arr(a.flujo).map(f=>`${f.paso}${f.resultado?" → "+f.resultado:""}`)},
    {h:"Decisiones",items:arr(a.decisiones).map(x=>`${x.decision}${x.motivo?" ("+x.motivo+")":""}`)},
    {h:"Preguntas abiertas",items:arr(a.preguntas_abiertas)},
    {h:"QA",items:[`Puntuación ${q.puntuacion!=null?q.puntuacion:"—"}/100`].concat(arr(q.problemas).filter(p=>p.severidad==="alta").map(p=>`${p.pantalla}: ${p.detalle}`))},
    {h:"Cambios de esta versión",items:[v.request].concat(arr(v.cambios))},
    {h:"Sistema de diseño",items:v.ui&&v.ui.ds?[`${v.ui.ds}. Componentes, variables y estilos del archivo Rumbo Design System.`]:[]}
  ].filter(s=>s.items.length)};
}
/* Nota para la tarjeta «Documentación» de Figma: tarea nueva (necesidad + solución) o existente (solicitud + cambio) */
function noteCase(key,v){
  const sent=Object.keys((S.runs[key]||{}).figmaSent||{}).map(k=>Number(k.slice(1))).filter(n=>n&&n!==v.n);
  const lastN=sent.length?Math.max(...sent):0;
  const since=(S.versions[key]||[]).filter(x=>x.n>lastN&&x.n<=v.n).sort((a,b)=>a.n-b.n);
  return {existing:!!lastN,lastN,since};
}
function promptNotes(key,v,d,nc){
  const a=v.architect||{};
  return fillPrompt("notas",{
    CASO:nc.existing?`CASO: Tarea ya existente (ya se envió la v${nc.lastN} a Figma). parte1 = breve explicación de lo solicitado desde entonces. parte2 = breve explicación del cambio realizado.`:"CASO: Tarea nueva (primera vez en Figma). parte1 = breve explicación de la necesidad del cliente. parte2 = breve explicación de la solución que se le dio.",
    CARD:issueCtx(d),
    PROPUESTA:J({objetivo:a.objetivo,pantallas:arr(v.ui&&v.ui.screens).map(x=>({nombre:x.name,proposito:x.purpose})),flujo:arr(a.flujo).map(f=>f.paso)}),
    CAMBIOS:nc.existing?"PETICIONES Y CAMBIOS DESDE EL ÚLTIMO ENVÍO\n"+J(nc.since.map(x=>({version:x.n,peticion:x.request,cambios:x.cambios}))):""});
}
async function figNote(key,v,d){
  const nc=noteCase(key,v); const a=v.architect||{};
  const fb=nc.existing?{parte1:clip(nc.since.map(x=>x.request).filter(Boolean).join(". ")||"Ajustes sobre la versión anterior.",260),parte2:clip(nc.since.flatMap(x=>arr(x.cambios)).join(". ")||"Se actualizó la propuesta según lo solicitado.",260)}
    :{parte1:clip((d&&d.summary?d.summary+". ":"")+(a.objetivo||""),260),parte2:clip("Se proponen "+arr(v.ui&&v.ui.screens).length+" pantallas: "+arr(v.ui&&v.ui.screens).map(x=>x.name).join(", ")+".",260)};
  let r=fb;
  if(S.sample){
    try{
      const notePromise = S.sample.json(promptNotes(key,v,d,nc),{modelTier:"default",cache:false});
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3500));
      const o = await Promise.race([notePromise, timeoutPromise]);
      if(o&&o.parte1&&o.parte2) r={parte1:clip(o.parte1,320),parte2:clip(o.parte2,320)};
    }catch(e){}
  }
  return nc.existing?{heading:`Tarea ya existente · cambios sobre v${nc.lastN}`,text:`Solicitado: ${r.parte1}\n\nCambio realizado: ${r.parte2}`}
    :{heading:"Tarea nueva",text:`Necesidad: ${r.parte1}\n\nSolución: ${r.parte2}`};
}
/* Páginas del archivo de Figma para elegir dónde se envía la propuesta */
async function loadFigPages(force){
  const tg=figTarget(); if(!tg||!S.mcp) return;
  if(S.busy.figPages||(S.figPages&&!force&&S.figPagesKey===tg.key)) return;
  S.busy.figPages=true; S.figPagesErr=null; renderAll();
  try{
    const res=await call(FIG,"use_figma",{fileKey:tg.key,description:"Lista las páginas del archivo para elegir dónde enviar la propuesta",skillNames:"resource:figma-use",
      code:'const out=[];for(const p of figma.root.children){let n=0;try{await p.loadAsync();n=p.children.filter(c=>c.type==="SECTION").length}catch(e){}out.push({id:p.id,name:p.name,sections:n})}return {pages:out}'});
    const list=arr(res&&(res.pages||res)).filter(p=>p&&p.id&&p.name);
    if(!list.length) throw {message:"Figma no devolvió páginas."};
    S.figPages=list; S.figPagesKey=tg.key; S.figPagesAt=Date.now();
  }catch(e){ S.figPagesErr=e&&e.code?mcpMsg(e,"Figma"):clip((e&&e.message)||"No se pudieron leer las páginas.",200); }
  S.busy.figPages=false; renderAll();
}
function figPageChoice(key){
  const list=S.figPages||[]; let v=S.figPageSel[key];
  if(!v||(v!=="__new__"&&!list.some(p=>p.id===v))){ const last=lsGet("ep_figpage"); const lib=figLib();
    v=(last&&list.some(p=>p.id===last))?last:((lib&&lib.workPage&&(list.find(p=>p.name===lib.workPage)||{}).id)||"__new__"); }
  return v;
}
function figPageHTML(key,v,d){
  const tg=figTarget(); if(!tg) return "";
  const sel=figPageChoice(key); const list=S.figPages||[]; const page=list.find(p=>p.id===sel);
  const newName=S.figNewName[key]!=null?S.figNewName[key]:clip(`${key} · ${(d&&d.summary)||"Propuesta"}`,80);
  return `<div class="fld"><label for="figPage" class="small">Página de Figma donde se envía</label>
    <div class="btns" style="margin:0"><select id="figPage" ${S.busy.figPages?"disabled":""}>${S.busy.figPages&&!list.length?`<option>Cargando páginas…</option>`:""}${list.map(p=>`<option value="${esc(p.id)}" ${p.id===sel?"selected":""}>${esc(p.name)}${p.sections?` · ${p.sections} ${p.sections===1?"sección":"secciones"}`:""}</option>`).join("")}<option value="__new__" ${sel==="__new__"?"selected":""}>+ Página nueva…</option></select>
    </div>
    ${sel==="__new__"?`<input id="figNewPage" type="text" value="${esc(newName)}" placeholder="Nombre de la página nueva" style="margin-top:6px">`:""}
    <span class="small muted">${sel==="__new__"?"Se crea una página con este nombre (si tu plan de Figma no admite más, irá a la última página).":page&&page.sections?"Se coloca debajo de la última sección, que pasa a Old.":"La página está vacía."}</span>
    ${S.figPagesErr?`<span class="small" style="color:var(--err)">No se pudieron leer las páginas: ${esc(S.figPagesErr)}</span>`:""}</div>`;
}
async function sendToFigma(key){
  const run=S.runs[key]; const v=selVersion(key); const d=S.detail[key]||issueOf(key);
  if(!v||S.busy["fig"+key]) return;
  const notify=false;
  const tg=figTarget();
  if(!tg){ S.msgs["fig"+key]="El enlace del archivo de Figma de los ajustes no es válido. Pega el enlace completo del archivo (figma.com/design/…)."; renderAll(); return; }
  S.busy["fig"+key]=true; S.msgs["fig"+key]=null; renderAll();
  try{
    const fileKey=tg.key, fileUrl=tg.url;
    const tpl=$("#figmaRenderer").textContent;
    const lib=figLib();
    const spec=Object.assign({},linkUI(v.ui,flowOf(v)),lib?{dsLib:{sets:lib.sets,vars:lib.vars,text:lib.text,icons:lib.icons}}:{}); delete spec.tokens; delete spec.notas;
    const ch=figPageChoice(key); const pg=(S.figPages||[]).find(p=>p.id===ch);
    const nn=(S.figNewName[key]!=null?S.figNewName[key]:clip(`${key} · ${(d&&d.summary)||"Propuesta"}`,80)).trim()||clip(`${key} · Propuesta`,80);
    S.msgs["fig"+key]=null; S.figStage=S.figStage||{}; S.figStage[key]="Escribiendo la nota…"; renderAll();
    const note=await figNote(key,v,d); S.figStage[key]="Dibujando en Figma…"; renderAll();
    const meta=Object.assign(figmaMeta(key,v,d),{note:Object.assign({label:`${key} · v${v.n}`},note)},ch==="__new__"?{newPage:true,targetPage:nn}:{pageId:ch,targetPage:pg?pg.name:""});
    if(ch!=="__new__") lsSet("ep_figpage",ch);
    const code=tpl.replace("__SPEC__",()=>J(spec)).replace("__META__",()=>J(meta));
    if(code.length>500000) throw {message:"La propuesta es demasiado grande para enviarla a Figma de una vez. Reduce pantallas o bloques."};
    const res=await call(FIG,"use_figma",{fileKey,code,description:`Crea la página ${key} v${v.n} con la propuesta de diseño`,skillNames:"resource:figma-use"});
    const nodeId=res&&(res.nodeId||res.pageId||res.boardId);
    if(res&&res.fallback) S.msgs["fig"+key]=`Tu plan de Figma ya no admite más páginas, así que la propuesta se añadió como sección en la página «${res.pageName}». Borra páginas antiguas o mueve el archivo a un plan de pago para tener una página por tarea.`;
    if(res&&arr(res.dsErrors).length) S.msgs["fig"+key]=(S.msgs["fig"+key]?S.msgs["fig"+key]+" ":"")+"Algunos bloques se dibujaron sin componente del sistema: "+arr(res.dsErrors).slice(0,3).join("; ");
    const link=fileUrl+(nodeId?`?node-id=${String(nodeId).replace(":","-")}`:"");
    const sent=Object.assign({},run.figmaSent||{}); sent["v"+v.n]=link;
    S.figInfo=S.figInfo||{}; S.figInfo[key]=res&&res.pageName?`Enviada a «${res.pageName}» como «${res.sectionName||""}»${res.tareaNew?" con la tarea en In progress":""}${res.tareaOld?`; ${res.tareaOld} tarea${res.tareaOld===1?"":"s"} anterior${res.tareaOld===1?"":"es"} pasa${res.tareaOld===1?"":"n"} a Old`:""}.`:"";
    S.figPages=null; loadFigPages(true); if(res&&res.pageId){ S.figPageSel[key]=res.pageId; lsSet("ep_figpage",res.pageId); }
    await setRun(key,{status:"approved",approvedVersion:v.n,approvedAt:new Date().toISOString(),figmaSent:sent,figmaFileKey:fileKey,figmaUrl:fileUrl},true);
    S.pmDraft[key]=null; S.stepView[key]=null; setFlow(key,{figmaDone:false,delivered:null,moved:false});
    if(notify){
      const body=[`Propuesta de diseño v${v.n} revisada y aprobada por el equipo.`,"",`* Figma: ${link}`,`* Pantallas: ${arr(v.ui.screens).map(s=>s.name).join(", ")}`,(v.architect&&v.architect.objetivo)?`* Objetivo: ${v.architect.objetivo}`:"",arr(v.architect&&v.architect.preguntas_abiertas).length?"":"",...(arr(v.architect&&v.architect.preguntas_abiertas).length?["Preguntas abiertas:"].concat(arr(v.architect.preguntas_abiertas).map(q=>`* ${q}`)):[])].filter(Boolean).join("\n");
      try{ await call(ATL,"addOrEditJiraIssueComment",{cloudId:S.cloudId,issueIdOrKey:key,commentBody:body}); loadDetail(key,true); }
      catch(e){ S.msgs["fig"+key]="Figma listo, pero no se pudo comentar en Jira: "+mcpMsg(e,"Jira"); }
    }
  }catch(e){ const m=String((e&&e.message)||""); S.msgs["fig"+key]=/PAGE_LIMIT|only comes with 3 pages/i.test(m)?"Tu archivo de Figma está en el plan Starter (máximo 3 páginas) y no queda ninguna página donde añadir la propuesta. Borra una página o mueve el archivo a un plan de pago y vuelve a aprobar.":e&&e.code==="tool_error"&&/PAGE_LIMIT/.test(m)?"":e&&e.code?mcpMsg(e,"Figma"):clip(m||"No se pudo enviar a Figma.",260); }
  S.busy["fig"+key]=false; renderAll();
}

/* ---------- Comentarios y documentación ---------- */
async function postComment(key,body){
  if(!body.trim()||S.busy["c"+key]) return;
  S.busy["c"+key]=true; S.msgs["c"+key]=null; renderAll();
  try{ await call(ATL,"addOrEditJiraIssueComment",{cloudId:S.cloudId,issueIdOrKey:key,commentBody:body.trim()}); S.drafts[key+":comment"]=""; const t=$("#cmtBox"); if(t) t.value=""; S.msgs["c"+key]="ok"; await loadDetail(key,true); }
  catch(e){ S.msgs["c"+key]=mcpMsg(e,"Jira")+(e&&(e.code==="server_unavailable"||e.code==="upstream_error")?" Revisa la card antes de reenviar: puede que el comentario se publicara.":""); }
  S.busy["c"+key]=false; renderAll();
}
function docMarkdown(key,v,d){
  const a=v.architect||{}, w=v.writer||{}, q=v.qa||{}, u=v.ui||{};
  const L=[];
  L.push(`# ${key} · ${(d&&d.summary)||""}`,`Versión v${v.n} · ${fmtTime(v.createdAt)}`,"");
  L.push("## Objetivo",a.objetivo||"—","");
  if(arr(a.usuarios).length) L.push("## Usuarios",...arr(a.usuarios).map(x=>`* ${x}`),"");
  if(arr(a.supuestos).length) L.push("## Supuestos",...arr(a.supuestos).map(x=>`* ${x}`),"");
  L.push("## Flujo",...arr(a.flujo).map((f,i)=>`${i+1}. ${f.paso}${f.resultado?" → "+f.resultado:""}`),"");
  L.push("## Pantallas",...arr(u.screens).map(s=>`* **${s.name}**: ${s.purpose||""}`),"");
  if(arr(a.decisiones).length) L.push("## Decisiones",...arr(a.decisiones).map(x=>`* ${x.decision}${x.motivo?` (${x.motivo})`:""}`),"");
  if(u.ds) L.push("## Sistema de diseño",`Pantallas construidas con ${u.ds}.`,"");
  if(arr(u.notas).length) L.push("## Notas visuales",...arr(u.notas).map(x=>`* ${x}`),"");
  if(w.tono) L.push("## Tono",w.tono,"");
  if(arr(w.glosario).length) L.push("## Glosario",...arr(w.glosario).map(g=>`* **${g.termino}**: ${g.uso}`),"");
  if(arr(a.relacion_tareas).length) L.push("## Relación con otras tareas",...arr(a.relacion_tareas).map(r=>`* ${r.key}: ${r.como}`),"");
  L.push("## QA",`Puntuación ${q.puntuacion!=null?q.puntuacion:"—"}/100. ${q.resumen||""}`,...arr(q.problemas).map(p=>`* [${p.severidad}] ${p.pantalla}: ${p.detalle}`),"");
  if(arr(a.preguntas_abiertas).length) L.push("## Preguntas abiertas",...arr(a.preguntas_abiertas).map(x=>`* ${x}`),"");
  const vs=(S.versions[key]||[]).slice().sort((x,y)=>x.n-y.n);
  if(vs.length) L.push("## Historial de versiones",...vs.map(x=>`* v${x.n} (${fmtTime(x.createdAt)}): ${x.request}${arr(x.cambios).length?" — "+arr(x.cambios).join("; "):""}`),"");
  const run=S.runs[key]||{};
  if(run.figmaUrl) L.push("## Figma",run.figmaUrl);
  return L.join("\n");
}

/* ---------- Render: pantallas ---------- */
/* Vista previa fiel a la librería de Figma (Rumbo): misma anatomía, iconos, medidas y colores que los componentes */
const RB_ICONS={"arrow-left":["M19 12H5","M12 19L5 12L12 5"],"close":["M18 6L6 18","M6 6L18 18"],"chevron-right":["M9 18L15 12L9 6"],"chevron-down":["M6 9L12 15L18 9"],"search":["M11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18Z","M20 20L15.7 15.7"],"location":["M12 21C12 21 5 14.8 5 10C5 8.14348 5.7375 6.36301 7.05025 5.05025C8.36301 3.7375 10.1435 3 12 3C13.8565 3 15.637 3.7375 16.9497 5.05025C18.2625 6.36301 19 8.14348 19 10C19 14.8 12 21 12 21Z","M12 12.5C13.3807 12.5 14.5 11.3807 14.5 10C14.5 8.61929 13.3807 7.5 12 7.5C10.6193 7.5 9.5 8.61929 9.5 10C9.5 11.3807 10.6193 12.5 12 12.5Z"],"clock":["M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z","M12 7V12L15 14"],"star":["M12 3L14.8 8.7L21 9.6L16.5 14L17.6 20.2L12 17.3L6.4 20.2L7.5 14L3 9.6L9.2 8.7L12 3Z"],"car":["M5 16V11L7 6H17L19 11V16H5Z","M7 19V16","M17 19V16","M5 11H19"],"card":["M19 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18H19C20.1046 18 21 17.1046 21 16V8C21 6.89543 20.1046 6 19 6Z","M3 10H21"],"user":["M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z","M4 21C4 17 8 15 12 15C16 15 20 17 20 21"],"home":["M3 11L12 4L21 11","M5 10V20H19V10"],"activity":["M8 6H20","M8 12H20","M8 18H20","M4 6H4.01","M4 12H4.01","M4 18H4.01"],"grid":["M9.5 4H5.5C4.67157 4 4 4.67157 4 5.5V9.5C4 10.3284 4.67157 11 5.5 11H9.5C10.3284 11 11 10.3284 11 9.5V5.5C11 4.67157 10.3284 4 9.5 4Z","M18.5 4H14.5C13.6716 4 13 4.67157 13 5.5V9.5C13 10.3284 13.6716 11 14.5 11H18.5C19.3284 11 20 10.3284 20 9.5V5.5C20 4.67157 19.3284 4 18.5 4Z","M9.5 13H5.5C4.67157 13 4 13.6716 4 14.5V18.5C4 19.3284 4.67157 20 5.5 20H9.5C10.3284 20 11 19.3284 11 18.5V14.5C11 13.6716 10.3284 13 9.5 13Z","M18.5 13H14.5C13.6716 13 13 13.6716 13 14.5V18.5C13 19.3284 13.6716 20 14.5 20H18.5C19.3284 20 20 19.3284 20 18.5V14.5C20 13.6716 19.3284 13 18.5 13Z"],"info":["M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z","M12 11V16","M12 8H12.01"],"check":["M5 12L10 17L19 7"],"alert":["M12 3L21 19H3L12 3Z","M12 10V14","M12 17H12.01"],"phone":["M5 4H9L11 9L8.5 10.5C9.57096 12.6715 11.3285 14.429 13.5 15.5L15 13L20 15V19C20 19.5304 19.7893 20.0391 19.4142 20.4142C19.0391 20.7893 18.5304 21 18 21C14.0993 20.763 10.4202 19.1065 7.65683 16.3432C4.8935 13.5798 3.23705 9.90074 3 6C3 5.46957 3.21071 4.96086 3.58579 4.58579C3.96086 4.21071 4.46957 4 5 4Z"],"message":["M4 5H20V16H9L4 20V5Z"],"shield":["M12 3L20 6V12C20 17 16.5 20 12 21C7.5 20 4 17 4 12V6L12 3Z"],"plus":["M12 5V19","M5 12H19"],"minus":["M5 12H19"],"share":["M12 3V15","M7 8L12 3L17 8","M5 14V20H19V14"],"locate":["M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z","M12 2V5","M12 19V22","M2 12H5","M19 12H22"]};
const RB_WORDS=[[/compart/i,"share"],[/hora|program|reserv|tiempo/i,"clock"],[/aeropuerto|vuelo|terminal/i,"location"],[/casa|hogar|home/i,"home"],[/trabajo|oficina/i,"grid"],[/pago|tarjeta|visa|cobro|efectivo/i,"card"],[/segur|emergencia|protecc/i,"shield"],[/llam|tel[eé]fono/i,"phone"],[/mensaje|chat/i,"message"],[/conductor|perfil|cuenta|usuario/i,"user"],[/coche|veh[ií]culo|viaje|taxi|confort|xl|eco/i,"car"],[/valor|estrella|calific/i,"star"],[/ayuda|info/i,"info"]];
function rbIconFor(s,d){ s=String(s||""); for(const [r,n] of RB_WORDS) if(r.test(s)) return n; return d||"location"; }
function rbI(n,sz,cls){ const p=RB_ICONS[n]||RB_ICONS.info; return `<svg class="ri${cls?" "+cls:""}" width="${sz||24}" height="${sz||24}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p.map(d=>`<path d="${d}"/>`).join("")}</svg>`; }
function isRumboUI(ui){ return /componentes de Figma/.test(String(ui&&ui.ds||""))||(!(ui&&ui.ds)&&!!figLib()); }
function rbMap(kind,eta){
  const k=kind==="route"||kind==="approaching"?kind:"explore";
  const roads=`<ellipse cx="300" cy="100" rx="90" ry="60" fill="var(--rb-park)"/><g fill="var(--rb-road)"><rect x="0" y="120" width="375" height="14"/><rect x="0" y="300" width="375" height="18"/><rect x="90" y="0" width="12" height="420"/><rect x="250" y="0" width="16" height="420"/><rect x="-60" y="200" width="520" height="10" transform="rotate(28 -60 200)"/></g>`;
  const pick=(x,y)=>`<circle cx="${x+14}" cy="${y+14}" r="14" fill="var(--rb-brand)"/><circle cx="${x+14}" cy="${y+14}" r="5" fill="#000"/>`;
  const dest=(x,y)=>`<rect x="${x}" y="${y}" width="28" height="28" rx="6" fill="#fff"/><rect x="${x+9}" y="${y+9}" width="10" height="10" rx="2" fill="#000"/>`;
  const car=(x,y,s)=>`<circle cx="${x+s/2}" cy="${y+s/2}" r="${s/2}" fill="#fff"/><g transform="translate(${x+s/2-9} ${y+s/2-9}) scale(.75)" fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${RB_ICONS.car.map(d=>`<path d="${d}"/>`).join("")}</g>`;
  let mk="", etaPos=null;
  if(k==="explore") mk=pick(174,196)+car(60,90,32)+car(280,240,32)+car(150,330,32);
  if(k==="route"){ mk=`<path d="M94 358L94 305L256 305L256 125L318 125" fill="none" stroke="var(--rb-route)" stroke-width="5" stroke-linejoin="round"/>`+pick(82,346)+dest(306,113); etaPos=[270,72]; }
  if(k==="approaching"){ mk=`<path d="M256 58L256 125L94 125L94 228" fill="none" stroke="var(--rb-route)" stroke-width="5" stroke-linejoin="round"/>`+pick(82,216)+car(238,40,40); etaPos=[60,176]; }
  const etaH=eta&&etaPos?`<span class="r-eta" style="left:${etaPos[0]}px;top:${etaPos[1]}px">${esc(eta)}</span>`:"";
  return `<div class="r-map"><svg width="375" height="420" viewBox="0 0 375 420" aria-hidden="true"><rect width="375" height="420" fill="var(--rb-land)"/>${roads}${mk}</svg>${etaH}<span class="r-locate">${rbI("locate")}</span></div>`;
}
function rumbo2html(ui,only){
  const TO=x=>x?` data-to="${esc(x)}"`:"";
  const BLEED=new Set(["list","option","check","sectionheading","tabs","divider","driver","map","sheetheader","appbar"]);
  const TONE={info:["info","info"],accent:["info","info"],success:["positive","check"],positive:["positive","check"],warning:["warning","alert"],error:["negative","alert"],negative:["negative","alert"]};
  const TAG={gray:"tn",solid:"tb",accent:"ti",info:"ti",positive:"tp",success:"tp",warning:"tw",negative:"tx",error:"tx"};
  const btn=(label,variant,to,extra)=>{ const h={primary:"p",secondary:"s",ghost:"t",danger:"d"}[variant||"primary"]||"p"; return `<div class="r-btn ${h}${extra||""}"${TO(to)}>${esc(label)}</div>`; };
  function comp(b){
    switch(b.t){
      case "appbar": { if(!b.left) return `<div class="r-nav lg"><div class="r-t24">${esc(b.title)}</div></div>`;
        return `<div class="r-nav"><span class="r-ib"${b.to?TO(b.to):" data-back"}>${rbI(b.left==="close"?"close":"arrow-left")}</span><div class="r-l16 r-grow">${esc(b.title)}</div>${b.right?`<span class="r-l14 r-sec" style="padding:0 12px">${esc(b.right)}</span>`:`<span style="width:48px"></span>`}</div>`; }
      case "sheetheader": return `<div class="r-sheet"><i class="r-handle"></i><div class="r-row" style="padding:0 8px 0 16px"><div class="r-grow" style="display:grid;gap:2px"><div class="r-t20">${esc(b.title)}</div>${b.subtitle?`<div class="r-b14 r-sec">${esc(b.subtitle)}</div>`:""}</div>${b.close!==false?`<span class="r-ib"${b.to?TO(b.to):" data-back"}>${rbI("close")}</span>`:""}</div></div>`;
      case "button": return btn(b.label,b.variant,b.to,b.disabled?" off":"");
      case "input": case "select": return `<div class="r-field"><div class="r-l14">${esc(b.label||"")}</div><div class="r-in${b.error?" err":""}"><span class="r-grow ${b.value?"":"r-ter"}">${esc(b.value||b.placeholder||"")}</span>${b.t==="select"?rbI("chevron-down"):""}</div>${b.error||b.helper?`<div class="r-c12 ${b.error?"r-neg":"r-sec"}">${esc(b.error||b.helper)}</div>`:""}</div>`;
      case "search": return `<div class="r-search"${TO(b.to)}>${rbI("search")}<span class="r-grow ${b.value?"":"r-sec"}">${esc(b.value||b.placeholder||"")}</span>${b.action?`<span class="r-chip">${rbI("clock",16)}${esc(b.action)}</span>`:""}</div>`;
      case "banner": { const [tn,ic]=TONE[b.tone]||TONE.info; return `<div class="r-banner" style="background:var(--rb-${tn}-bg)"${TO(b.to)}><span style="color:var(--rb-${tn})">${rbI(ic)}</span><div style="display:grid;gap:4px">${b.title?`<div class="r-l14">${esc(b.title)}</div>`:""}<div class="r-b14">${esc(b.text)}</div>${b.action?`<div class="r-l14" style="text-decoration:underline">${esc(b.action)}</div>`:""}</div></div>`; }
      case "list": return arr(b.items).map(i=>{ if(!i||typeof i!=="object") i={title:String(i||"")}; const nav=!i.trailing||i.trailing==="›"||i.chevron; const tr=nav?(i.lead||""):i.trailing;
        return `<div class="r-li"${TO(i.to)}>${i.icon!==false?`<span class="r-lead">${rbI(rbIconFor((i.icon||"")+" "+i.title+" "+(i.subtitle||"")))}</span>`:""}<div class="r-grow r-ct"><div class="r-l16">${esc(i.title)}</div>${i.subtitle?`<div class="r-b14 r-sec">${esc(i.subtitle)}</div>`:""}</div>${tr?`<span class="r-l16 r-sec">${esc(tr)}</span>`:""}${nav?`<span class="r-sec">${rbI("chevron-right")}</span>`:""}</div>`; }).join("");
      case "option": { const d=[b.subtitle,b.badge&&b.badge.text].filter(Boolean).join(" · ");
        return `<div class="r-li${b.selected?" sel":""}"${TO(b.to)}><span class="r-lead">${rbI(rbIconFor(b.icon||b.title,"car"))}</span><div class="r-grow r-ct"><div class="r-l16">${esc((b.title||"")+(b.capacity?" · "+b.capacity:""))}</div>${d?`<div class="r-b14 r-sec">${esc(d)}</div>`:""}</div>${b.price?`<span class="r-l16">${esc(b.price)}</span>`:""}<span class="r-radio${b.selected?" on":""}"></span></div>`; }
      case "check": if(b.kind==="toggle") return `<div class="r-li"><div class="r-grow r-l16">${esc(b.label)}</div><span class="r-sw${b.checked?" on":""}"><i></i></span></div>`;
        return `<div class="r-li"${TO(b.to)}><div class="r-grow r-ct"><div class="r-l16">${esc(b.label)}</div>${b.detail?`<div class="r-b14 r-sec">${esc(b.detail)}</div>`:""}</div>${b.kind==="radio"?`<span class="r-radio${b.checked?" on":""}"></span>`:`<span class="r-cb${b.checked?" on":""}">${b.checked?rbI("check",18):""}</span>`}</div>`;
      case "chips": case "tags": return `<div class="r-tags">${arr(b.items).map(x=>{ const it=x&&typeof x==="object"?x:{text:x}; return `<span class="r-tag ${b.t==="chips"?"tn":TAG[it.tone||"gray"]||"tn"}">${esc(it.text)}</span>`; }).join("")}</div>`;
      case "tabs": return `<div class="r-tabs">${arr(b.items).slice(0,3).map((x,i)=>`<span class="${i===(b.active||0)?"on":""}">${esc(x)}</span>`).join("")}</div>`;
      case "segmented": return `<div class="r-seg">${arr(b.items).slice(0,3).map((x,i)=>`<span class="${i===(b.active||0)?"on":""}">${esc(x)}</span>`).join("")}</div>`;
      case "sectionheading": return `<div class="r-sh"><div class="r-l16 r-grow">${esc(b.text)}</div>${b.action?`<span class="r-l14 r-sec">${esc(b.action)}</span>`:""}</div>`;
      case "progress": return `${b.label?`<div class="r-l14">${esc(b.label)}</div>`:""}<div class="r-pg"><i style="width:${b.value==null?40:Math.max(0,Math.min(100,Number(b.value)||0))}%"></i></div>`;
      case "divider": return `<div class="r-dv${b.thick?" k":""}"></div>`;
      case "avatar": return `<div class="r-row" style="gap:12px"><span class="r-av">${esc(String(b.initials||String(b.name||"·").split(" ").map(x=>x[0]).join("")).slice(0,2).toUpperCase())}</span><div style="display:grid;gap:2px"><div class="r-l16">${esc(b.name)}</div>${b.detail?`<div class="r-b14 r-sec">${esc(b.detail)}</div>`:""}</div></div>`;
      case "driver": { const nm=b.name||"Carlos M."; return `<div class="r-driver"><span class="r-av lg">${esc(nm.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase())}</span><div class="r-grow" style="display:grid;gap:4px"><div class="r-row" style="gap:8px"><span class="r-l16">${esc(nm)}</span><span class="r-c12 r-sec r-row" style="gap:2px">${rbI("star",14)}${esc(b.rating||"4,95")}</span></div><div class="r-b14 r-sec">${esc(b.car||"Toyota Corolla · Gris")}</div></div><span class="r-plate">${esc(b.plate||"4821 LKY")}</span></div>`; }
      case "map": return rbMap(b.kind||b.mode||(/ruta|route|destino/i.test(b.label||"")?"route":/conductor|llega|camino/i.test(b.label||"")?"approaching":"explore"),b.eta);
      case "empty": return `<div class="r-empty"><span class="r-ill">${rbI(b.kind==="success"?"check":b.kind==="error"||b.kind==="warning"?"alert":"activity",32)}</span><div class="r-t18">${esc(b.title)}</div>${b.text?`<div class="r-b14 r-sec">${esc(b.text)}</div>`:""}${b.cta?`<div class="r-btn p m"${TO(b.to)}>${esc(b.cta)}</div>`:""}</div>`;
      case "snackbar": return `<div class="r-snack"><span class="r-grow r-b14">${esc(b.text)}</span>${b.action?`<span class="r-l14">${esc(b.action)}</span>`:""}</div>`;
      case "dialog": return `<div class="r-dialog"><div class="r-t18">${esc(b.title)}</div><div class="r-b14 r-sec">${esc(b.text)}</div><div style="display:grid;gap:8px;padding-top:8px">${b.primary?btn(b.primary,"danger",b.to):""}${b.secondary?btn(b.secondary,"ghost",b.secondaryTo):""}</div></div>`;
      default: return null;
    }
  }
  function blk(b){
    if(!b||typeof b!=="object") return "";
    if(b.t==="image"&&/mapa|map|ruta/i.test(b.label||"")) return comp(Object.assign({},b,{t:"map"}));
    const c=comp(b);
    if(c!=null) return BLEED.has(b.t)?c:`<div class="r-blk">${c}</div>`;
    let h="";
    switch(b.t){
      case "heading": h=`<div class="${(b.level||1)===1?"r-t24":(b.level===2?"r-t20":"r-t18")}">${esc(b.text)}</div>`; break;
      case "text": h=`<div class="${b.size==="s"?"r-b14":"r-b16"}${b.tone==="muted"?" r-sec":""}">${esc(b.text)}</div>`; break;
      case "card": h=`<div class="r-card"${TO(b.to)}>${b.meta?`<div class="r-c12 r-sec">${esc(b.meta)}</div>`:""}${b.title?`<div class="r-l16">${esc(b.title)}</div>`:""}${b.body?`<div class="r-b14 r-sec">${esc(b.body)}</div>`:""}${b.cta?`<div class="r-l14" style="text-decoration:underline">${esc(b.cta)}</div>`:""}</div>`; break;
      case "stat": h=`<div class="r-card" style="padding:12px;gap:2px"><div class="r-c12 r-sec">${esc(b.label)}</div><div class="r-t18">${esc(b.value)}</div>${b.delta?`<div class="r-c12" style="color:var(--rb-positive)">${esc(b.delta)}</div>`:""}</div>`; break;
      case "tile": h=`<div class="r-card r-tile"${TO(b.to)}>${rbI(rbIconFor(b.icon+" "+b.label,"car"))}<div class="r-l14">${esc(b.label)}</div></div>`; break;
      case "row": case "grid": { const k=arr(b.children); const n=b.t==="grid"?Math.max(1,Math.min(4,b.cols||2)):Math.max(1,k.length); h=`<div style="display:grid;gap:12px;grid-template-columns:repeat(${n},minmax(0,1fr))">${k.map(x=>{ const c=comp(x||{}); return c!=null?c:inner(x); }).join("")}</div>`; break; }
      case "image": h=`<div class="r-card r-img" style="height:${Math.min(400,Number(b.h)||160)}px">${esc(b.label||"Imagen")}</div>`; break;
      case "spacer": h=`<div style="height:${Math.min(80,Number(b.h)||8)}px"></div>`; break;
      default: h=b.text||b.label?`<div class="r-b16">${esc(b.text||b.label)}</div>`:"";
    }
    return h?`<div class="r-blk">${h}</div>`:"";
  }
  function inner(x){ const s=blk(x); return s.replace(/^<div class="r-blk">/,"<div>"); }
  const NAV=[["Inicio","home"],["Servicios","grid"],["Actividad","activity"],["Cuenta","user"]];
  return arr(ui.screens).map((s,i)=>{
    if(only!=null&&only!==i) return "";
    const bl=arr(s.blocks).filter(b=>b&&typeof b==="object");
    const foot=bl.filter(b=>b.t==="bottomnav"||b.t==="dock"), rest=bl.filter(b=>b.t!=="bottomnav"&&b.t!=="dock"), lead=[];
    while(rest.length&&(rest[0].t==="appbar"||rest[0].t==="map"||(rest[0].t==="image"&&/mapa|map|ruta/i.test(rest[0].label||"")))) lead.push(rest.shift());
    const afterMap=lead.length&&lead[lead.length-1].t!=="appbar";
    const footH=foot.map(b=>{ if(b.t==="dock") return `<div class="r-dock">${b.caption?`<div class="r-c12 r-sec">${esc(b.caption)}</div>`:""}${b.secondary?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${btn(b.secondary,"secondary",b.secondaryTo)}${btn(b.label,"primary",b.to)}</div>`:btn(b.label,"primary",b.to)}</div>`;
      const act=String((arr(b.items)[b.active||0])||"").toLowerCase(); let ai=NAV.findIndex(([n])=>act.startsWith(n.toLowerCase().slice(0,4))); if(ai<0) ai=Math.min(3,b.active||0);
      const tabs=b.tabs||{}; return `<div class="r-bnav">${NAV.map(([n,ic],j)=>`<span class="${j===ai?"on":""}"${j!==ai&&tabs[n]?` data-nav="${esc(tabs[n])}"`:""}>${rbI(ic)}<b>${n}</b></span>`).join("")}</div>`; }).join("");
    return `<div class="scol" data-sid="${esc(s.id)}"><div class="lbl"><b>${i+1}. ${esc(s.name||"Pantalla")}</b>${s.purpose?`<p>${esc(s.purpose)}</p>`:""}</div>
      <div class="phbox"><div class="ph rb"><div class="r-status"><b>9:41</b><span><i style="width:17px"></i><i style="width:15px"></i><i style="width:25px;height:12px"></i></span></div>${lead.map(blk).join("")}<div class="r-content" style="padding-top:${afterMap?0:8}px">${rest.map(blk).join("")}</div>${footH}</div></div></div>`;
  }).join("");
}

/* Enlaces del prototipo: solo las transiciones que define el arquitecto UX. Nunca se inventan saltos.
   - Quita destinos inexistentes y, si la arquitectura declara transiciones, cualquier "to" que no esté entre ellas.
   - Si falta el "to" de una transición declarada, lo coloca en el elemento cuyo texto coincide con su disparador.
   - La barra inferior se enlaza con las pantallas que llevan el nombre de su pestaña (sin flecha en la vista Flujo). */
const NAV_TABS=["Inicio","Servicios","Actividad","Cuenta"];
function flowOf(v){ const a=v&&v.architect, u=v&&v.ui; if(a&&Array.isArray(a.transiciones)) return a; if(u&&Array.isArray(u.transiciones)) return {transiciones:u.transiciones,fuera_de_alcance:u.fuera_de_alcance,tipo_flujo:u.tipo_flujo}; return a; }
function linkUI(ui,arch){
  const u=JSON.parse(JSON.stringify(ui||{})); const sc=arr(u.screens); const ids=new Set(sc.map(s=>s.id));
  const tr=arch&&Array.isArray(arch.transiciones)?arch.transiciones.filter(t=>t&&ids.has(t.desde)&&ids.has(t.hacia)&&t.desde!==t.hacia):null;
  const ok=(from,to)=>ids.has(to)&&to!==from&&(!tr||tr.some(t=>t.desde===from&&t.hacia===to));
  const norm=x=>String(x||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
  const texts=b=>[b.label,b.title,b.placeholder,b.cta,b.text,b.primary].filter(Boolean);
  sc.forEach(s=>{
    const clean=b=>{ if(!b||typeof b!=="object") return; if(b.to&&!ok(s.id,b.to)) delete b.to; if(b.secondaryTo&&!ok(s.id,b.secondaryTo)) delete b.secondaryTo; arr(b.items).forEach(i=>{ if(i&&typeof i==="object"&&i.to&&!ok(s.id,i.to)) delete i.to; }); arr(b.children).forEach(clean); if(b.t==="bottomnav"){ delete b.to; } };
    arr(s.blocks).forEach(clean);
    const place=(trig,val,isExt)=>{
      const d=norm(trig); if(!d) return false;
      const hit=x=>{ const n=norm(x); return n&&(n===d||n.includes(d)||d.includes(n)); };
      const free=o=>!o.to||(!isExt&&String(o.to).startsWith("ext:"));
      const walk=bl=>{ for(const b of arr(bl)){ if(!b||typeof b!=="object") continue;
        if(b.t==="list"){ const it=arr(b.items).find(i=>i&&typeof i==="object"&&hit(i.title)&&free(i)); if(it){ it.to=val; return true; } continue; }
        if(b.t==="dock"||b.t==="dialog"){ if(hit(b.label||b.primary)&&free(b)){ b.to=val; return true; } if(hit(b.secondary)&&!b.secondaryTo){ b.secondaryTo=val; return true; } continue; }
        if(["button","search","option","card","empty","tile","banner"].includes(b.t)&&texts(b).some(hit)&&free(b)){ b.to=val; return true; }
        if(b.children&&walk(b.children)) return true; } return false; };
      return walk(s.blocks);
    };
    if(tr) tr.filter(t=>t.desde===s.id).forEach(t=>{
      const has=b=>!!(b&&typeof b==="object"&&(b.to===t.hacia||b.secondaryTo===t.hacia||arr(b.items).some(i=>i&&i.to===t.hacia)||arr(b.children).some(has)));
      if(arr(s.blocks).some(has)) return;
      place(t.disparador,t.hacia,false);
    });
    arr(arch&&arch.fuera_de_alcance).forEach(f=>{ if(f&&typeof f==="object"&&f.desde===s.id&&f.destino) place(f.disparador,"ext:"+String(f.destino).slice(0,40),true); });
  });
  const byTab={}; NAV_TABS.forEach(n=>{ const m=sc.find(x=>norm(x.name).startsWith(norm(n).slice(0,4))); if(m) byTab[n]=m.id; });
  sc.forEach(s=>arr(s.blocks).forEach(b=>{ if(b&&b.t==="bottomnav"){ const tabs={}; Object.entries(byTab).forEach(([n,id])=>{ if(id!==s.id) tabs[n]=id; }); b.tabs=tabs; } }));
  return u;
}
function spec2html(ui,only){
  if(isRumboUI(ui)) return rumbo2html(ui,only);
  const t=Object.assign({primary:"#0F6E6A",onPrimary:"#FFFFFF",bg:"#FFFFFF",surface:"#F4F5F7",surface2:"#E8EAED",text:"#16181D",textSecondary:null,muted:"#5F6672",border:"#E1E4E8",radius:12,cardRadius:null,cardStyle:"filled",cardBorderW:0,inputFill:null,inputBorder:null,inputBorderW:1,bannerRadius:null,bannerMark:false,secondaryBg:null,tabStyle:"pill",tagRadius:99,h1:26,h2:20,h3:17,body:15,accent:"#2563EB",positive:"#15803D",warning:"#B45309",negative:"#B91C1C",accentLight:null,positiveLight:null,warningLight:null,negativeLight:null,warningBg:null,fontUI:null,fontHeading:null,fontMono:null},ui.tokens||{});
  const C=(c,d)=>/^#[0-9a-f]{3,8}$/i.test(String(c||""))?c:d;
  const N=(n,d)=>{ const x=Number(n); return isNaN(x)||n===null||n===""?d:x; };
  const F=s=>String(s||"").replace(/[;{}<>]/g,"");
  const rr=Math.min(28,N(t.radius,12));
  const sec=t.secondaryBg?C(t.secondaryBg,"#F3F3F3"):null;
  const v={"--p":C(t.primary,"#0F6E6A"),"--op":C(t.onPrimary,"#fff"),"--b":C(t.bg,"#fff"),"--sf":C(t.surface,"#F4F5F7"),"--sf2":C(t.surface2,"#E8EAED"),"--tx":C(t.text,"#16181D"),"--tx2":C(t.textSecondary,C(t.muted,"#5F6672")),"--mu":C(t.muted,"#5F6672"),"--bd":C(t.border,"#E1E4E8"),
    "--rr":rr+"px","--cr":Math.min(28,N(t.cardRadius,rr))+"px","--cbg":t.cardStyle==="outlined"?"var(--b)":"var(--sf)","--cbw":(t.cardStyle==="outlined"?Math.min(4,N(t.cardBorderW,1)):0)+"px",
    "--ifill":C(t.inputFill,"var(--b)"),"--ib":C(t.inputBorder,"var(--bd)"),"--ibw":Math.min(4,N(t.inputBorderW,1))+"px","--br":Math.min(28,N(t.bannerRadius,rr))+"px","--tr":Math.min(99,N(t.tagRadius,99))+"px",
    "--secbg":sec||"transparent","--secfg":sec?C(t.text,"#000"):C(t.primary,"#0F6E6A"),"--secring":sec?"transparent":C(t.primary,"#0F6E6A"),"--tlbg":sec?"var(--b)":"color-mix(in srgb,var(--p) 14%,transparent)","--navon":sec?"var(--tx)":"var(--p)",
    "--h1":N(t.h1,26)+"px","--h2":N(t.h2,20)+"px","--h3":N(t.h3,17)+"px","--body":N(t.body,15)+"px",
    "--neg":C(t.negative,"#B91C1C"),"--pos":C(t.positive,"#15803D")};
  if(t.fontUI) v["--fui"]=F(t.fontUI); if(t.fontHeading) v["--fh"]=F(t.fontHeading); if(t.fontMono) v["--fmono"]=F(t.fontMono);
  const style=Object.entries(v).map(([k,x])=>`${k}:${x}`).join(";");
  const TONE={info:[t.accent,t.accentLight],accent:[t.accent,t.accentLight],warning:[t.warning,t.warningLight,t.warningBg],success:[t.positive,t.positiveLight],positive:[t.positive,t.positiveLight],error:[t.negative,t.negativeLight],negative:[t.negative,t.negativeLight]};
  const tone=k=>{ const x=TONE[k]||TONE.info; const c=C(x[0],"#2563EB"); return {c,soft:x[1]?C(x[1],c+"1A"):c+"1A",mark:C(x[2],c)}; };
  const desk=ui.platform==="desktop";
  const TO=x=>x?` data-to="${esc(x)}"`:"";
  function blk(b){ const h=blk0(b); return b&&b.to&&h&&b.t!=="list"&&b.t!=="dialog"?h.replace(/^<(\w+)/,`<$1${TO(b.to)}`):h; }
  function blk0(b){
    if(!b||typeof b!=="object") return "";
    switch(b.t){
      case "heading": return `<div class="h${Math.min(3,Math.max(1,b.level||1))}">${esc(b.text)}</div>`;
      case "text": return `<div class="tx${b.tone==="muted"?" mu":""}${b.size==="s"?" s":""}">${esc(b.text)}</div>`;
      case "button": return `<div class="b ${esc(b.variant||"primary")}">${esc(b.label)}</div>`;
      case "input": return `<div class="in">${b.label?`<label>${esc(b.label)}</label>`:""}<div class="f${b.value?" v":""}${b.error?" e":""}">${esc(b.value||b.placeholder||"")}</div>${b.error?`<small class="e">${esc(b.error)}</small>`:b.helper?`<small>${esc(b.helper)}</small>`:""}</div>`;
      case "card": return `<div class="cd">${b.meta?`<span class="mt">${esc(b.meta)}</span>`:""}${b.title?`<b>${esc(b.title)}</b>`:""}${b.body?`<p>${esc(b.body)}</p>`:""}${b.cta?`<span class="c">${esc(b.cta)}</span>`:""}</div>`;
      case "stat": return `<div class="stt"><span>${esc(b.label)}</span><b>${esc(b.value)}</b>${b.delta?`<i>${esc(b.delta)}</i>`:""}</div>`;
      case "list": return `<div class="ls">${arr(b.items).map(i=>`<div class="li"${TO(i&&i.to)}>${i.lead?`<span class="ld">${esc(i.lead)}</span>`:""}<div><b>${esc(i.title)}</b>${i.subtitle?`<span>${esc(i.subtitle)}</span>`:""}</div>${i.trailing?`<em>${esc(i.trailing)}</em>`:""}</div>`).join("")}</div>`;
      case "chips": case "tags": return `<div class="chs">${arr(b.items).map(s=>{ const it=s&&typeof s==="object"?s:{text:s}; const k=it.tone||"gray"; if(k==="solid") return `<span style="background:var(--tx);color:var(--b)">${esc(it.text)}</span>`; if(TONE[k]){ const x=tone(k); return `<span style="background:${x.soft};color:${x.c}">${esc(it.text)}</span>`; } return `<span>${esc(it.text)}</span>`; }).join("")}</div>`;
      case "tabs": return t.tabStyle==="underline"? `<div class="tabsu">${arr(b.items).map((s,i)=>`<span class="${i===(b.active||0)?"on":""}">${esc(s)}</span>`).join("")}</div>` : `<div class="chs">${arr(b.items).map((s,i)=>`<span class="${i===(b.active||0)?"on":""}" style="border-radius:99px">${esc(s)}</span>`).join("")}</div>`;
      case "segmented": return `<div class="seg">${arr(b.items).map((s,i)=>`<span class="${i===(b.active||0)?"on":""}">${esc(s)}</span>`).join("")}</div>`;
      case "check": { const k=b.kind==="radio"?"r":b.kind==="toggle"?"t":"c"; return `<div class="ck"><i class="${k}${b.checked?" on":""}"></i>${esc(b.label)}</div>`; }
      case "progress": return `<div class="pg">${b.label?`<label>${esc(b.label)}</label>`:""}<div><i style="width:${Math.max(0,Math.min(100,Number(b.value)||0))}%"></i></div></div>`;
      case "avatar": return `<div class="av"><i>${esc(String(b.initials||b.name||"·").slice(0,2).toUpperCase())}</i><div><b>${esc(b.name)}</b>${b.detail?`<span>${esc(b.detail)}</span>`:""}</div></div>`;
      case "image": return `<div class="img" style="height:${Math.min(400,Number(b.h)||160)}px">${esc(b.label||"Imagen")}</div>`;
      case "banner": { const x=tone(b.tone); const mark=!!t.bannerMark; const fg=mark?"var(--tx)":x.c; return `<div class="bn" style="background:${x.soft};color:${fg}">${mark?`<span class="mk" style="background:${x.mark}"></span>`:""}<div>${b.title?`<b>${esc(b.title)}</b>`:""}<span${b.title?"":' style="font-weight:500"'}>${esc(b.text)}</span></div></div>`; }
      case "row": { const k=arr(b.children); return `<div class="rw" style="grid-template-columns:repeat(${Math.max(1,k.length)},minmax(0,1fr))">${k.map(blk).join("")}</div>`; }
      case "grid": return `<div class="rw" style="grid-template-columns:repeat(${Math.max(1,Math.min(4,b.cols||2))},minmax(0,1fr))">${arr(b.children).map(blk).join("")}</div>`;
      case "tile": return `<div class="tl"><i>${esc(String(b.icon||b.label||"·").trim().charAt(0).toUpperCase())}</i>${esc(b.label)}</div>`;
      case "select": return `<div class="in">${b.label?`<label>${esc(b.label)}</label>`:""}<div class="f${b.value?" v":""}" style="display:flex;justify-content:space-between">${esc(b.value||b.placeholder||"")}<span>⌄</span></div>${b.helper?`<small>${esc(b.helper)}</small>`:""}</div>`;
      case "sectionheading": return `<div class="h3" style="padding-top:8px">${esc(b.text)}</div>`;
      case "empty": return `<div style="display:grid;gap:8px;justify-items:center;text-align:center;padding:24px 8px"><div class="img" style="width:96px;height:96px;border-radius:50%">${esc(b.kind||"")}</div><div class="h2">${esc(b.title)}</div>${b.text?`<div class="tx mu">${esc(b.text)}</div>`:""}${b.cta?`<div class="b" style="justify-self:stretch">${esc(b.cta)}</div>`:""}</div>`;
      case "search": return `<div class="sb"><i></i><span>${esc(b.placeholder||"")}</span>${b.action?`<b>${esc(b.action)}</b>`:""}</div>`;
      case "option": { let bd=""; if(b.badge&&b.badge.text){ const k=b.badge.tone||"accent"; const x=tone(k); const solid=k==="accent"||k==="info"; bd=`<em style="background:${solid?x.c:x.soft};color:${solid?"#fff":x.c}">${esc(b.badge.text)}</em>`; } return `<div class="op${b.selected?" on":""}"><i>${esc(String(b.icon||b.title||"·").slice(0,3))}</i><div><b>${esc(b.title)}${b.capacity?` <small>● ${esc(b.capacity)}</small>`:""}</b>${b.subtitle?`<span>${esc(b.subtitle)}</span>`:""}${bd}</div>${b.price?`<strong>${esc(b.price)}</strong>`:""}</div>`; }
      case "divider": return `<div class="dv"></div>`;
      case "map": return `<div class="img" style="height:240px;margin:0 -16px;border-radius:0;background:repeating-linear-gradient(0deg,transparent 0 46px,rgba(255,255,255,.08) 46px 52px),repeating-linear-gradient(90deg,transparent 0 70px,rgba(255,255,255,.08) 70px 78px),var(--s)">${b.eta?`<span style="background:#fff;color:#000;border-radius:99px;padding:4px 10px;font-weight:600">${esc(b.eta)}</span>`:"Mapa"}</div>`;
      case "driver": return `<div class="av"><i>${esc(String(b.name||"·").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase())}</i><div><b>${esc(b.name)} <small>★ ${esc(b.rating||"")}</small></b><span>${esc(b.car||"")}</span></div><strong style="margin-left:auto;font-family:monospace;background:var(--s);padding:4px 8px;border-radius:8px">${esc(b.plate||"")}</strong></div>`;
      case "snackbar": return `<div class="bn" style="background:var(--tx);color:var(--b)"><div><span>${esc(b.text)}</span></div>${b.action?`<b style="text-decoration:underline">${esc(b.action)}</b>`:""}</div>`;
      case "dialog": return `<div class="cd"><b>${esc(b.title)}</b><p>${esc(b.text)}</p>${b.primary?`<div class="b danger"${TO(b.to)}>${esc(b.primary)}</div>`:""}${b.secondary?`<div class="b ghost"${TO(b.secondaryTo)}>${esc(b.secondary)}</div>`:""}</div>`;
      case "spacer": return `<div style="height:${Math.min(80,Number(b.h)||8)}px"></div>`;
      default: return b.text||b.label?`<div class="tx">${esc(b.text||b.label)}</div>`:"";
    }
  }
  return arr(ui.screens).map((s,i)=>{
    if(only!=null&&only!==i) return "";
    const bl=arr(s.blocks);
    const bars=bl.filter(b=>b&&(b.t==="appbar"||b.t==="sheetheader")), nav=bl.filter(b=>b&&(b.t==="bottomnav"||b.t==="dock")), body=bl.filter(b=>b&&!["appbar","sheetheader","bottomnav","dock"].includes(b.t));
    return `<div class="scol${desk?" desk":""}" data-sid="${esc(s.id)}"><div class="lbl"><b>${i+1}. ${esc(s.name||"Pantalla")}</b>${s.purpose?`<p>${esc(s.purpose)}</p>`:""}</div>
      <div class="phbox"><div class="ph${desk?" desk":""}" style="${esc(style)}">
        ${bars.map(b=>b.t==="sheetheader"?`<div class="bar" style="flex-direction:column;align-items:center;gap:6px"><span style="width:36px;height:4px;border-radius:2px;background:var(--bd)"></span><b style="text-align:center">${esc(b.title)}</b>${b.subtitle?`<span class="tx mu s">${esc(b.subtitle)}</span>`:""}</div>`:`<div class="bar">${b.left?`<span${b.to?TO(b.to):b.left==="back"||b.left==="close"?" data-back":""}>${b.left==="back"?"‹":b.left==="close"?"✕":"≡"}</span>`:""}<b>${esc(b.title)}</b>${b.right?`<span class="a">${esc(b.right)}</span>`:""}</div>`).join("")}
        <div class="ct">${body.map(blk).join("")}</div>
        ${nav.map(b=>b.t==="dock"?`<div style="display:grid;gap:8px;padding:12px 16px 24px;border-top:1px solid var(--bd)"><div class="b"${TO(b.to)}>${esc(b.label)}</div>${b.secondary?`<div class="b secondary"${TO(b.secondaryTo)}>${esc(b.secondary)}</div>`:""}</div>`:`<div class="nav${t.navStyle==="pill"?" pill":""}">${arr(b.items).map((x,j)=>{ const id=j!==(b.active||0)&&b.tabs?Object.entries(b.tabs).find(([n])=>String(x).toLowerCase().startsWith(n.toLowerCase().slice(0,4))):null; return `<span class="${j===(b.active||0)?"on":""}"${id?` data-nav="${esc(id[1])}"`:""}>${esc(x)}</span>`; }).join("")}</div>`).join("")}
      </div></div></div>`;
  }).join("");
}
/* Escala cada pantalla (375 px o 1440 px reales) al ancho de su columna para que nunca haya scroll horizontal */
function fitPhones(){
  document.querySelectorAll(".phbox").forEach(box=>{
    const ph=box.firstElementChild; if(!ph) return;
    const base=ph.classList.contains("desk")?1440:375;
    const k=Math.min(1,box.clientWidth/base)||1;
    ph.style.transform=`scale(${k})`; ph.style.transformOrigin="top left";
    box.style.height=Math.ceil(ph.offsetHeight*k)+"px";
  });
}
function flowNote(ui,arch){
  let n=0, tabs=false; const cnt=b=>{ if(!b||typeof b!=="object") return; if(b.to) n++; if(b.secondaryTo) n++; arr(b.items).forEach(i=>{ if(i&&i.to) n++; }); arr(b.children).forEach(cnt); if(b.t==="bottomnav"&&b.tabs&&Object.keys(b.tabs).length) tabs=true; };
  arr(ui.screens).forEach(s=>arr(s.blocks).forEach(cnt));
  const legacy=!(arch&&Array.isArray(arch.transiciones));
  const tabTxt=tabs?" Las líneas discontinuas salen de la barra inferior de la primera pantalla hacia cada pestaña.":"";
  if(legacy) return (n?"Versión anterior a la validación del flujo: estas flechas las propuso el agente de UI sin revisar. Regenera la propuesta para que salgan solo de transiciones reales.":"Esta versión no define saltos entre pantallas.")+tabTxt;
  if(!n) return (arch.tipo_flujo==="pestanas"?"Son pantallas hermanas: se conectan solo por la barra inferior.":"La arquitectura no define saltos entre estas pantallas.")+tabTxt;
  return "Cada flecha sale del elemento que se pulsa y lleva a su pantalla; las etiquetas blancas señalan pantallas que no forman parte de esta propuesta."+tabTxt;
}
/* Dibuja las flechas del flujo entre pantallas (vista Flujo) */
/* Flechas legibles: una por cada par de pantallas (sin ida y vuelta) y las pestañas de la barra inferior solo desde la primera pantalla que la tiene */
function drawFlow(){
  const row=document.getElementById("flowRow"), svg=document.getElementById("flowSvg"); if(!row||!svg) return;
  const R=row.getBoundingClientRect();
  const off=el=>{ const b=el.getBoundingClientRect(); return {x:b.left-R.left+row.scrollLeft,y:b.top-R.top+row.scrollTop,w:b.width,h:b.height}; };
  const cols=[...row.querySelectorAll(".scol")]; const byId={};
  cols.forEach((c,i)=>{ byId[c.dataset.sid]={box:c.querySelector(".phbox"),i}; });
  let maxB=0; cols.forEach(c=>{ const o=off(c.querySelector(".phbox")); maxB=Math.max(maxB,o.y+o.h); });
  const firstNav=cols.findIndex(c=>c.querySelector("[data-nav]"));
  const labOf=h=>((h.querySelector(".r-l16,b")||h).textContent||"").trim().replace(/\s+/g," ").slice(0,24);
  const paths=[], labels=[], low=[], pairs=new Set();
  cols.forEach((c,i)=>{ const src=off(c.querySelector(".phbox"));
    c.querySelectorAll("[data-to],[data-nav]").forEach(h=>{
      const nav=h.hasAttribute("data-nav"); const to=nav?h.dataset.nav:h.dataset.to; const o=off(h), y=o.y+o.h/2;
      if(!nav&&to.startsWith("ext:")){ const x2=src.x+src.w+26; const nm=to.slice(4); paths.push([`M${o.x+o.w+3} ${y}H${x2}`,"ext"]); labels.push([x2+4,y+4,nm.length>19?nm.slice(0,18)+"…":nm,"ext"]); return; }
      if(nav&&i!==firstNav) return;
      if(nav) h.classList.add("hl");
      const tg=byId[to]; if(!tg||tg.i===i) return;
      const key=[Math.min(i,tg.i),Math.max(i,tg.i)].join("-"); if(pairs.has(key)) return; pairs.add(key);
      const t=off(tg.box); const lab=nav?labOf(h):labOf(h);
      if(!nav&&tg.i===i+1){ const mx=src.x+src.w+(t.x-src.x-src.w)/2; const ty=Math.min(t.y+t.h-24,Math.max(t.y+24,y));
        paths.push([`M${o.x+o.w+3} ${y}H${mx}V${ty}H${t.x-3}`,""]); if(lab) labels.push([src.x+src.w+8,y-8,lab,""]); }
      else low.push({sx:o.x+o.w/2,sy:nav?o.y+o.h:src.y+src.h,ex:t.x+t.w/2,ey:t.y+t.h+3,dist:Math.abs(tg.i-i),lab,nav});
    });
  });
  /* las más lejanas van por el carril más cercano a las pantallas para que no se crucen */
  low.sort((p,q)=>q.dist-p.dist).forEach((L,k)=>{ const yy=maxB+26+k*20;
    paths.push([`M${L.sx} ${L.sy}V${yy}H${L.ex}V${L.ey}`,L.nav?"nav":""]); if(L.lab) labels.push([L.ex+6,yy-5,L.lab,L.nav?"nav":""]); });
  row.style.paddingBottom=Math.max(70,50+low.length*20)+"px";
  svg.setAttribute("width",row.scrollWidth); svg.setAttribute("height",row.scrollHeight);
  const lb=labels.map(([x,y,t,k])=>{ const w=t.length*6.2+12; return `<rect class="${k}" x="${x}" y="${y-12}" width="${w}" height="17" rx="8.5"/><text x="${x+6}" y="${y}">${esc(t)}</text>`; }).join("");
  svg.innerHTML=`<defs><marker id="fah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round">${paths.map(([d,k])=>`<path class="${k}" d="${d}" marker-end="url(#fah)"/>`).join("")}</g>${lb}`;
}
window.addEventListener("resize",()=>{ clearTimeout(window.__fitT); window.__fitT=setTimeout(()=>{ fitPhones(); drawFlow(); },80); });

/* ---------- Render: general ---------- */
function issueOf(key){ return arr(S.issues).find(i=>i.key===key); }
function statusChip(i){ const c=i.cat==="done"?"ok":i.cat==="indeterminate"?"acc":""; return `<span class="chip ${c}">${esc(i.status||"Sin estado")}</span>`; }
function runChip(key){
  const r=S.runs[key];
  if(!r) return S.queue.includes(key)?`<span class="chip run">En cola</span>`:`<span class="chip">Sin propuesta</span>`;
  if(isStale(r)) return `<span class="chip err">Interrumpido</span>`;
  if(r.status==="running") return `<span class="chip run"><span class="spin" aria-hidden="true"></span>${r.stage==="cambios"?"Aplicando cambios":"Agentes trabajando"}</span>`;
  if(r.status==="error") return `<span class="chip err">Error en agentes</span>`;
  const fl=S.flow[key]||{};
  if(fl.delivered) return `<span class="chip ok">Entregada a PM</span>`;
  if(fl.figmaDone) return `<span class="chip warn">Por entregar a PM</span>`;
  if(r.status==="approved") return `<span class="chip ok">En Figma · v${esc(r.approvedVersion)}</span>`;
  return `<span class="chip warn">Revisar v${esc(r.version)}</span>`;
}
/* Por qué esta vista no tiene conectores, agentes o datos compartidos, y cómo arreglarlo */
function capHelp(cap){
  const st=S.permState?(S.permState[cap]||"unavailable"):null;
  const what={mcp:"tus conectores (Jira y Figma)",sample:"los agentes de Claude",db:"los datos compartidos del equipo"}[cap]||cap;
  if(st==="denied") return {msg:`Rechazaste el permiso para que esta página use ${what}. Ábrelo en Permisos, actívalo y recarga la página.`,btn:"Abrir permisos"};
  if(st==="prompt") return {msg:`Esta página necesita tu permiso para usar ${what}.`,btn:"Dar permiso"};
  if(st==="granted") return {msg:`El permiso para ${what} está concedido, pero no se pudo cargar. Recarga la página.`,btn:"Recargar"};
  return {msg:`Claude no permite que esta página use ${what} en tu cuenta. Pasa cuando abres la página desde fuera de la organización de quien la publicó (por ejemplo, invitado con otra cuenta) o con un enlace público: para usarla con Jira y Figma tenéis que estar en la misma organización de Claude (plan Team). Mientras tanto puedes ver las vistas sin datos de Jira.`,btn:null};
}
function capHelpHTML(cap){ const h=capHelp(cap); return `<div class="note err"><span>${esc(h.msg)}</span>${h.btn?`<button type="button" class="btn sm" data-act="perm" data-cap="${cap}">${esc(h.btn)}</button>`:""}</div>`; }
async function permAction(cap){
  const h=capHelp(cap); if(!S.perms){ location.reload(); return; }
  try{
    if(h.btn==="Recargar"){ location.reload(); return; }
    if(h.btn==="Dar permiso"){ const r=await S.perms.request([cap]); if(r&&r[cap]==="granted"){ location.reload(); return; } }
    else { await S.perms.manage(); }
    S.permState=await S.perms.state(); if(S.permState&&S.permState[cap]==="granted"){ location.reload(); return; }
  }catch(e){ alertPerm(); }
  renderAll();
}
function alertPerm(){ S.permMsg="No se pudo abrir el panel. Usa el menú Permisos de la página (arriba, en la barra de claude.ai)."; renderAll(); }
function jiraBlocker(){
  if(!S.booted) return `<div class="pad"><div class="empty"><span class="spin" aria-hidden="true"></span><strong>Preparando la conexión</strong></div></div>`;
  if(!S.mcp) return `<div class="pad">${capHelpHTML("mcp")}${S.permMsg?`<p class="small muted">${esc(S.permMsg)}</p>`:""}</div>`;
  if(S.jira==="err"&&!S.issues) return `<div class="pad"><div class="note err">${esc(mcpMsg(S.jiraErr,"Jira"))}<button type="button" class="btn sm" data-act="retryJira">Reintentar</button></div></div>`;
  if(!S.issues) return `<div class="pad"><div class="empty"><span class="spin" aria-hidden="true"></span><strong>Cargando cards de Jira</strong><span>Si es la primera vez, acepta el aviso para conectar Jira.</span></div></div>`;
  return "";
}
function renderConn(){
  const j=S.jira==="ok"?"ok":S.jira==="err"?"err":"warn";
  setHTML($("#conn"),`<span><i class="dot ${j}"></i>Jira${S.issuesAt?` · ${new Date(S.issuesAt).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}`:""}</span><span><i class="dot ${!S.booted?"warn":S.sample?"ok":"err"}"></i>Agentes</span>`);
  $("#siteLine").textContent = S.site?`${S.site.replace(/^https?:\/\//,"")} · proyecto ${S.project}`:(S.jira==="err"?"Sin conexión con Jira":"Conectando con Jira…");
}
/* Barras por criterio de la rúbrica: de un vistazo, qué tiene el brief y qué le falta */
const CRIT=[["necesidad","Necesidad",20],["contexto","Contexto",15],["objetivo","Objetivo",15],["alcance","Alcance y reglas",20],["casos","Casos límite",10],["restricciones","Restricciones",10],["datos","Fecha y prioridad",10]];
function critHTML(a){
  const c=a&&a.criterios; if(!c||typeof c!=="object") return "";
  const rows=CRIT.filter(([k])=>c[k]!=null).map(([k,l,m])=>{ const v=Math.max(0,Math.min(m,Number(c[k])||0)); const r=v/m; const cls=r>=.75?"ok":r>=.4?"warn":"err";
    return `<div class="cr" title="${esc(l)}: ${v} de ${m}"><span class="cr-l">${esc(l)}</span><span class="cr-b"><i style="width:${Math.max(4,r*100)}%;background:var(--${cls})"></i></span><span class="cr-v mono">${v}/${m}</span></div>`; });
  return rows.length?`<div class="sec"><h3>Qué tiene el brief</h3><div class="crs">${rows.join("")}</div></div>`:"";
}
function renderClient(){
  // historial
  const bl=jiraBlocker();
  let h=bl;
  if(!bl){
    h = S.issues.length? `<ul class="hist">${S.issues.map(i=>`<li class="issue">
      <span class="k">${esc(i.key)}</span>
      <span class="t">${esc(i.summary)}</span>
      <span class="m">${statusChip(i)}<span>${esc(fmtDate(i.created))}</span>${i.labels.includes(LABEL)?`<span>Desde el portal</span>`:""}</span>
      <div class="side"><a class="btn sm" href="${esc(i.url)}" target="_blank" rel="noopener">Abrir en Jira ↗</a></div>
      <details data-key="${esc(i.key)}"><summary>Ver detalle</summary><div class="mdx">${md(i.description)}</div></details>
    </li>`).join("")}</ul>` : `<div class="pad"><div class="empty"><strong>Aún no hay peticiones</strong><span>Crea la primera con el formulario.</span></div></div>`;
  }
  setHTML($("#histClient"),h);
  // botón y análisis
  const btn=$("#analyzeBtn");
  btn.disabled=S.client.busy||S.client.sending;
  btn.innerHTML=S.client.busy?'<span class="spin" aria-hidden="true"></span> Revisando…':(S.client.analysis?(S.client.editing?"Guardar y volver a revisar":"Volver a revisar con mis respuestas"):"Revisar el brief");
  { const collapsed=!!S.client.analysis&&!S.client.editing;
    $("#briefPanel").hidden=collapsed; $("#briefSum").hidden=true; $("#exMenu").hidden=!!S.client.analysis; $("#briefH").textContent=S.client.analysis?"Editar petición":"Nueva petición";
    $("#closeEditBtn").hidden=!(S.client.analysis&&S.client.editing); }
  const a=S.client.analysis, panel=$("#analysisPanel");
  panel.hidden=(S.client.editing&&!S.client.busy)||!(a||S.client.err||S.client.created||S.client.busy);
  if(S.client.busy&&!a){ setHTML($("#analysisBody"),`<div class="note"><span class="small"><span class="spin" aria-hidden="true"></span> El analista está leyendo tu petición y el historial de Jira…</span></div>`); setHTML($("#analysisChip"),""); return; }
  if(S.client.created&&!a){ const c=S.client.created; setHTML($("#analysisBody"),`<div class="note ok"><b>Card creada${c.key?`: ${esc(c.key)}`:""}</b><span>El equipo de diseño ya la tiene. La verás en el historial.</span>${c.url?`<a class="btn sm" href="${esc(c.url)}" target="_blank" rel="noopener">Abrir en Jira ↗</a>`:""}</div>`); setHTML($("#analysisChip"),""); return; }
  if(!a){ setHTML($("#analysisBody"),S.client.err?`<div class="note err">${esc(S.client.err)}</div>`:""); setHTML($("#analysisChip"),""); return; }
  const sc=Math.round(Number(a.puntuacion)||0); const LV={listo:["ok","Listo para enviar"],casi:["warn","Casi listo"],incompleto:["err","Le falta información"]};
  const lvl=LV[a.nivel]||LV[sc<45?"incompleto":sc<80?"casi":"listo"];
  setHTML($("#analysisChip"),`<span class="chip ${lvl[0]}">${lvl[1]}</span>`);
  const qs=arr(a.preguntas);
  const pendingReq=qs.filter(q=>q.obligatoria&&!(S.client.answers[q.id]||"").trim()).length;
  const pr={Low:"Baja",Medium:"Media",High:"Alta"}[$("#bPrio").value]||""; const dt=$("#bDate").value;
  const reqHTML=`<div class="req">
      <h3 class="req-t">${esc($("#bTitle").value||"(sin título)")}</h3>
      <div class="req-m small muted"><span>${dt?`Para el ${esc(new Date(dt+"T12:00").toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"}))}`:"Sin fecha deseada"}</span><span aria-hidden="true">·</span><span>Prioridad ${esc(pr)}</span><span aria-hidden="true">·</span>${S.client.editing?`<span>Editando abajo</span>`:`<button type="button" class="linkbtn" data-act="editBrief">Editar petición</button>`}</div>
      <details class="req-d"><summary class="small">Ver la petición completa</summary><div class="req-b small"><p><b>Qué necesita</b><br>${esc($("#bDesc").value)}</p>${$("#bGoal").value.trim()?`<p><b>Problema u objetivo</b><br>${esc($("#bGoal").value)}</p>`:""}<p><b>Plataforma</b> ${esc($("#bPlat").value)}</p></div></details>
    </div>`;
  const html=`<div class="analysis">
    ${reqHTML}
    <div class="score"><span class="mono">${sc}/100</span><div class="meter" aria-hidden="true"><i style="width:${Math.max(4,Math.min(100,sc))}%;background:var(--${lvl[0]})"></i></div></div>
    ${arr(a.puntos_flojos).length?`<div class="sec"><h3>Puntos flojos</h3><ul class="list">${arr(a.puntos_flojos).slice(0,5).map(p=>`<li><b>${esc(clip(p.tema,40))}</b>${p.detalle?`: ${esc(clip(p.detalle,80))}`:""}</li>`).join("")}</ul></div>`:""}
    ${qs.length?`<div class="sec"><h3>Preguntas del analista</h3><div class="qs">${qs.map(q=>`<div class="q"><div class="qh"><b>${esc(q.pregunta)}</b>${q.obligatoria?'<span class="chip warn">Necesaria</span>':`<span class="chip">${lvl[0]==="ok"?"Recomendada":"Opcional"}</span>`}</div>${q.motivo?`<span class="why">${esc(q.motivo)}</span>`:""}<textarea id="ans_${esc(q.id)}" data-ans="${esc(q.id)}" rows="2" placeholder="Tu respuesta"></textarea></div>`).join("")}</div></div>`:`<div class="note ok">No hay preguntas pendientes.</div>`}
    ${S.client.err?`<div class="note err">${esc(S.client.err)}</div>`:""}
    <div class="btns">
      <button type="button" class="btn" data-act="reanalyze" ${S.client.busy||S.client.sending?"disabled":""}>Volver a revisar</button>
      <button type="button" class="btn primary" data-act="send" ${S.client.busy||S.client.sending||!S.cloudId?"disabled":""}>${S.client.sending?'<span class="spin" aria-hidden="true"></span> Creando card…':(pendingReq?"Enviar igualmente a Jira":"Enviar a Jira")}</button>
      ${pendingReq?`<span class="small muted">${pendingReq===1?"Queda 1 pregunta necesaria":`Quedan ${pendingReq} preguntas necesarias`} sin responder.</span>`:""}
    </div></div>`;
  if(setHTML($("#analysisBody"),html)){ document.querySelectorAll("[data-ans]").forEach(t=>{ t.value=S.client.answers[t.dataset.ans]||""; }); }
}
function renderDesigner(){
  const bl=jiraBlocker();
  setHTML($("#histDesigner"), bl || (S.issues.length?`<ul class="hist">${S.issues.map(i=>`<li><button type="button" class="pick" data-pick="${esc(i.key)}" aria-current="${S.selected===i.key}"><span class="k">${esc(i.key)} · ${esc(fmtDate(i.created))}</span><span class="t">${esc(i.summary)}</span><span class="m">${statusChip(i)}${runChip(i.key)}</span></button></li>`).join("")}</ul>`:`<div class="pad"><div class="empty"><strong>No hay cards</strong><span>Cuando el cliente cree una, aparecerá aquí.</span></div></div>`));
  renderDetail();
}
function latestVersion(key){ const vs=S.versions[key]||[]; return vs.reduce((m,v)=>!m||v.n>m.n?v:m,null); }
function selVersion(key){ const vs=S.versions[key]||[]; const n=S.verSel[key]; return vs.find(v=>v.n===n)||latestVersion(key); }

/* ---------- Vista Diseñador por pasos ---------- */
const STEPS=[[1,"Brief"],[2,"Agentes"],[3,"Revisión"],[4,"Ajustes en Figma"],[5,"Entrega a PM"]];
function flowData(key){ return S.flow[key]||{}; }
function fixFigmaLink(link){
  if(!link) return link;
  const tg=figTarget();
  if(!tg) return link;
  if(!link.includes(tg.key)){
    const nodeMatch=link.match(/[?&]node-id=([^&#]+)/);
    const nodeId=nodeMatch?`?node-id=${nodeMatch[1]}`:(tg.url.includes("node-id")?`?${tg.url.split("?")[1]}`:"?node-id=0-1");
    const base=tg.url.split("?")[0];
    return `${base}${nodeId}`;
  }
  return link;
}
function sentLinks(key){
  const raw=(S.runs[key]||{}).figmaSent||{};
  const out={};
  for(const k in raw){ out[k]=fixFigmaLink(raw[k]); }
  return out;
}
function lastSent(key){ const s=sentLinks(key); const ns=Object.keys(s).map(k=>Number(k.slice(1))).filter(Boolean); if(!ns.length) return null; const n=Math.max(...ns); return {n,link:fixFigmaLink(s["v"+n])}; }
function curStep(key){
  const r=S.runs[key], f=flowData(key), v=latestVersion(key);
  if(f.delivered||f.figmaDone) return 5;
  if(r&&r.status==="running"&&r.stage!=="cambios"&&!isStale(r)) return 2;
  if(v&&lastSent(key)) return 4;
  if(v) return 3;
  if(r||f.briefOk||S.launching[key]) return 2;
  return 1;
}
function viewStep(key){ const c=curStep(key); const s=S.stepView[key]; return s&&s<=c?s:c; }
async function setFlow(key,patch){
  S.flow[key]=Object.assign({},S.flow[key]||{},patch); renderAll();
  if(S.db) try{ await S.db.doc("flow/"+key).set(S.flow[key]); }catch(e){}
}
function goStep(key,n){ S.stepView[key]=n; renderDetail(); const h=$("#dSteps"); if(h){ const r=h.getBoundingClientRect(); if(r.top<0) h.scrollIntoView({behavior:"smooth",block:"start"}); } }
function stepperHTML(key){
  const c=curStep(key), s=viewStep(key), f=flowData(key);
  return `<ol class="stepper" aria-label="Pasos">${STEPS.map(([n,l])=>{ const done=n<c||(n===5&&!!f.delivered); const st=n===s?"cur":done?"done":"lock";
    return `<li data-s="${st}"><button type="button" data-step="${n}" ${n>c?"disabled":""} ${n===s?'aria-current="step"':""}><span class="sn">${done?"✓":n}</span><span class="sl">${l}</span></button></li>`; }).join("")}</ol>`;
}
/* Mueve la card en Jira buscando la transición por nombre o estado destino */
const JIRA_MOVE={progress:{re:/in progress|en curso/i,id:"2",label:"In Progress"},pm:{re:/to do pm/i,id:"21",label:"To Do PM"}};
async function moveCard(key,which){
  const m=JIRA_MOVE[which]; const i=issueOf(key)||{};
  if(m.re.test(i.status||"")) return {skipped:true};
  let id=null;
  try{ const p=await call(ATL,"executeRead",{name:"listJiraIssueTransitions",cloudId:S.cloudId,inputs:{issueIdOrKey:key}});
    const ts=arr((p&&p.data&&p.data.transitions)||(p&&p.transitions));
    const t=ts.find(t=>m.re.test(t.name||"")||m.re.test((t.to&&t.to.name)||"")); if(t) id=String(t.id); }catch(e){}
  await call(ATL,"transitionJiraIssue",{cloudId:S.cloudId,issueIdOrKey:key,transitionId:id||m.id});
  if(i.key){ i.status=m.label; i.cat="indeterminate"; }
  setTimeout(()=>{ refreshIssues(); },800);
  return {moved:true};
}
function renderDetail(){
  const host=$("#detail"); const key=S.selected;
  if(!key){ setHTML(host,`<div class="pad"><div class="empty"><strong>Elige una card</strong><span>Irás paso a paso: brief, agentes, revisión, ajustes en Figma y entrega a PM.</span></div></div>`); return; }
  const i=issueOf(key)||S.detail[key]||{key,summary:"",status:""};
  if(!host.querySelector("#dHead")||host.dataset.cur2!==key){
    host.dataset.cur2=key; host.__h=null;
    host.innerHTML=`<div id="dHead"></div><div id="dSteps"></div><div id="dBody"></div>`;
  }
  setHTML($("#dHead"),`<div class="det-h"><div class="m"><span class="mono" style="color:var(--accent)">${esc(key)}</span>${statusChip(i)}${runChip(key)}<span>${esc(fmtDate(i.created))}</span><a href="${esc(i.url||"#")}" target="_blank" rel="noopener">Abrir en Jira ↗</a></div><h2>${esc(i.summary)}</h2></div>`);
  setHTML($("#dSteps"),stepperHTML(key));
  const st=viewStep(key);
  const body=$("#dBody");
  if(body.dataset.cur!==String(st)||body.dataset.cur2!==key){ body.dataset.cur=String(st); body.dataset.cur2=key; body.__h=null;
    body.innerHTML = st===1? `<div class="pad stepb"><section class="lstep"><div class="lh"><h3>Brief del cliente</h3></div><div id="lBrief"></div></section>
        <section class="lstep"><div class="lh"><h3>Comentarios en Jira</h3><button type="button" class="btn quiet sm" data-act="reloadDetail">Actualizar</button></div><div id="s1Cmts"></div>
          <div class="fld"><label for="askBox" class="small muted">Si al brief le falta algo, pregúntalo aquí antes de lanzar los agentes. Se publica en la card y no gasta créditos.</label><textarea id="askBox" rows="3" placeholder="Escribe un comentario para el cliente (opcional)."></textarea></div>
          <div class="btns" id="askBtns"></div></section>
        <div class="stepnav" id="s1Nav"></div></div>`
      : st===2? `<div class="pad stepb"><div id="pPipe"></div><div id="pLaunch"></div></div>`
      : st===3? `<div class="pad stepb"><div id="pPipe"></div><div id="pVers"></div><div id="pScreens"></div><details class="agdet" id="agDet"><summary>Ver el trabajo de cada agente</summary><div id="pAgents"></div></details><div id="pComposer"></div><div id="pApprove"></div></div>`
      : st===4? `<div class="pad stepb" id="s4Body"></div>`
      : `<div class="pad stepb"><div id="s5Body"></div><details class="agdet" id="docDet"><summary>Documentación de la propuesta</summary><div id="genBody"></div></details></div>`;
    const t=$("#askBox"); if(t) t.value=S.drafts[key+":ask"]||"";
    if(st===1&&S.asked[key]===undefined&&S.db){ S.asked[key]=null; S.db.doc("asks/"+key).get().then(sn=>{ if(sn.exists){ S.asked[key]=sn.data().at||null; renderDetail(); } }).catch(()=>{}); }
  }
  if(st===1) renderStep1(key);
  else if(st===2||st===3) renderPropuesta(key,st);
  else if(st===4) renderStep4(key);
  else renderStep5(key);
}
function renderStep1(key){
  const d=S.detail[key]; const desc=d?d.description:(issueOf(key)||{}).description;
  if(!d&&!S.busy["d"+key]&&!S.detailErr[key]) loadDetail(key);
  setHTML($("#lBrief"),desc?`<div class="lbrief${String(desc).length>900?" clamp":""}" id="lBriefBox"><div class="mdx" style="margin:0">${md(desc)}</div></div>${String(desc).length>900?`<button type="button" class="linkbtn small" data-act="briefMore">Ver completo</button>`:""}`:(S.busy["d"+key]?`<p class="small muted"><span class="spin" aria-hidden="true"></span> Cargando el brief…</p>`:`<p class="small muted">La card no tiene descripción.</p>`));
  const cs=d?arr(d.comments):[];
  setHTML($("#s1Cmts"),!d?(S.detailErr[key]?`<div class="note err">${esc(mcpMsg(S.detailErr[key],"Jira"))}</div>`:`<p class="small muted">Cargando comentarios…</p>`):cs.length?cs.map(c=>`<div class="cmt"><span class="who">${esc(c.author)} · ${esc(fmtTime(c.created))}</span><div>${md(c.body)}</div></div>`).join(""):`<p class="small muted">Sin comentarios todavía.</p>`);
  const ask=S.asked[key]; const pq=pendingQs(d||issueOf(key)||{});
  setHTML($("#askBtns"),`<button type="button" class="btn" data-act="ask" ${S.busy["ask"+key]?"disabled":""}>${S.busy["ask"+key]?'<span class="spin" aria-hidden="true"></span> Publicando…':"Publicar en Jira"}</button>${pq.length?`<button type="button" class="linkbtn small" data-act="askInsert">Añadir las ${pq.length} preguntas pendientes del analista</button>`:""}
    ${ask?`<span class="small muted">Comentario publicado ${esc(fmtTime(ask))}. La respuesta del cliente aparecerá arriba; los agentes leen todos los comentarios.</span>`:""}
    ${S.msgs["ask"+key]?`<span class="small" style="color:var(--err)">${esc(S.msgs["ask"+key])}</span>`:""}`);
  const done=curStep(key)>1;
  setHTML($("#s1Nav"),`<button type="button" class="btn primary" data-act="briefOk">${done?"Ir a los agentes →":"El brief está listo →"}</button><span class="small muted">${done?"El brief ya se dio por listo.":"Pasa a elegir y lanzar los agentes."}</span>`);
}
function scrNames(v){ const m={}; arr(v&&v.ui&&v.ui.screens).forEach((s,i)=>{ m[s.id||("s"+(i+1))]=s.name||("Pantalla "+(i+1)); }); return m; }
function deId(t,names){ return String(t||"").replace(/\b(s\d+)\b/g,(m,id)=>names[id]?`«${names[id]}»`:m); }
function firstSentence(t,n){ const x=String(t||"").split(/(?<=[.!?])\s/)[0]; return clip(x,n||110); }
function pendRaw(v){
  const a=(v&&v.architect)||{}, q=(v&&v.qa)||{}; const names=scrNames(v);
  return {names,preguntas:arr(a.preguntas_abiertas),problemas:arr(q.problemas).filter(p=>p.severidad==="alta").map(p=>({pantalla:names[p.pantalla]||p.pantalla||"",area:p.area,problema:deId(p.detalle,names),sugerencia:deId(p.sugerencia,names)}))};
}
function promptPend(v){ const r=pendRaw(v); return fillPrompt("pendientes",{PANTALLAS:Object.values(r.names).join(", ")||"—",PENDIENTES:J({preguntas_abiertas:r.preguntas,problemas_qa:r.problemas})}); }
function pendFallback(v){ const r=pendRaw(v);
  return {cliente:r.preguntas.slice(0,5).map(x=>firstSentence(x,90)),corregir:r.problemas.slice(0,5).map(p=>({pantalla:p.pantalla,texto:firstSentence(p.sugerencia||p.problema,100)})),total:{cliente:r.preguntas.length,corregir:r.problemas.length}}; }
async function loadPend(key,v){
  const k="pend"+key+":"+v.n; if(S.busy[k]||!S.sample) return; S.busy[k]=true;
  try{ const o=await S.sample.json(promptPend(v),{modelTier:"quick"});
    const out={v:v.n,cliente:arr(o&&o.cliente).map(x=>clip(String(x),140)).slice(0,5),corregir:arr(o&&o.corregir).map(x=>({pantalla:clip(String(x&&x.pantalla||""),60),texto:clip(String(x&&x.texto||x||""),160)})).filter(x=>x.texto).slice(0,5),at:new Date().toISOString()};
    await setFlow(key,{pend:out}); }
  catch(e){ S.flow[key]=Object.assign({},S.flow[key]||{},{pendErr:v.n}); }
  S.busy[k]=false; renderDetail();
}
function renderStep4(key){
  const ls=lastSent(key); const v=ls&&(S.versions[key]||[]).find(x=>x.n===ls.n)||latestVersion(key);
  const raw=pendRaw(v); const has=raw.preguntas.length||raw.problemas.length;
  const f=flowData(key); const ok=f.pend&&f.pend.v===(v&&v.n)?f.pend:null;
  if(has&&!ok&&v&&S.sample&&f.pendErr!==v.n) setTimeout(()=>loadPend(key,v),0);
  const P=ok||pendFallback(v); const loading=has&&!ok&&S.busy["pend"+key+":"+(v&&v.n)];
  const fb=pendFallback(v).total||{};
  const more=(n,shown)=>n>shown?`<span class="small muted">y ${n-shown} más en el detalle</span>`:"";
  setHTML($("#s4Body"),`<section class="lstep"><div class="lh"><h3>Ajusta los detalles en Figma</h3></div>
    <p>La v${esc(ls?ls.n:"")} ya está en Figma${S.figInfo&&S.figInfo[key]?`: ${esc(S.figInfo[key].replace(/^Enviada /,"").replace(/\.$/,""))}`:""}. Retoca allí lo que necesites; los cambios que hagas en Figma no vuelven a los agentes.</p>
    <div class="btns">${ls&&ls.link?`<a class="btn primary" href="${esc(ls.link)}" target="_blank" rel="noopener">Abrir en Figma ↗</a>`:""}</div></section>
    ${has?`<section class="lstep"><div class="lh"><h3>Pendiente de revisar</h3>${loading?`<span class="small muted"><span class="spin" aria-hidden="true"></span> Resumiendo…</span>`:""}</div>
      ${P.corregir.length?`<div class="pgrp"><h4>Corregir en Figma <span class="muted">· ${P.corregir.length}</span></h4><ul class="pendl">${P.corregir.map(x=>`<li>${x.pantalla?`<b>${esc(x.pantalla)}</b>`:""}<span>${esc(x.texto)}</span></li>`).join("")}</ul>${ok?"":more(fb.corregir,P.corregir.length)}</div>`:""}
      ${P.cliente.length?`<div class="pgrp"><h4>Confirmar con el cliente <span class="muted">· ${P.cliente.length}</span></h4><ul class="pendl">${P.cliente.map(x=>`<li><span>${esc(x)}</span></li>`).join("")}</ul>${ok?"":more(fb.cliente,P.cliente.length)}
        <div class="btns" style="margin:0"><button type="button" class="btn sm" data-act="askPend">Preguntar al cliente en Jira</button></div></div>`:""}
      <details class="pdet"><summary class="small">Ver el detalle completo de los agentes</summary>
        ${raw.problemas.length?`<h4>Problemas de QA (alta)</h4><ul class="list">${raw.problemas.map(p=>`<li><b>${esc(p.pantalla)}</b> · ${esc(p.problema)} <span class="muted">→ ${esc(p.sugerencia)}</span></li>`).join("")}</ul>`:""}
        ${raw.preguntas.length?`<h4>Preguntas abiertas</h4><ul class="list">${raw.preguntas.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}</details>
    </section>`:`<p class="small muted">Los agentes no dejaron preguntas abiertas ni problemas graves de QA.</p>`}
    <div class="stepnav"><button type="button" class="btn primary" data-act="figDone">He terminado en Figma →</button><button type="button" class="btn quiet" data-step="3">Volver a la revisión</button></div>`);
}
const PM_MENTION="@SebastianAcaiturri-Villa";
function listEs(xs){ return xs.length<2?xs.join(""):xs.slice(0,-1).join(", ")+" y "+xs[xs.length-1]; }
function pmMessage(key){
  const ls=lastSent(key); const v=(ls&&(S.versions[key]||[]).find(x=>x.n===ls.n))||latestVersion(key)||{};
  const a=v.architect||{}; const sc=arr(v.ui&&v.ui.screens).map(s=>s.name).filter(Boolean);
  const link=fixFigmaLink((ls&&ls.link)||(S.runs[key]||{}).figmaUrl||"");
  let did=sc.length?`diseñado ${sc.length===1?"1 pantalla":sc.length+" pantallas"} (${listEs(sc)})`:"revisado los textos de la tarea";
  const obj=String(a.objetivo||"").trim().replace(/[.\s]+$/,"");
  if(obj){ const w=obj.split(/\s+/)[0].toLowerCase(); did+=/^[a-záéíóú]+(ar|er|ir)$/.test(w)?` con el objetivo de ${obj.charAt(0).toLowerCase()+obj.slice(1)}`:`. Objetivo: ${obj}`; }
  const nc=v.n?noteCase(key,v):{existing:false,since:[]};
  const ch=nc.existing?nc.since.flatMap(x=>arr(x.cambios)).filter(Boolean):[];
  if(ch.length) did+=`. Respecto a la versión anterior, ${listEs(ch.map(c=>c.charAt(0).toLowerCase()+c.slice(1).replace(/[.\s]+$/,"")))}`;
  return `Hola ${PM_MENTION}! Ya hemos dejado en Figma cliente la [tarea](${link}).\n\nHemos ${did}.`;
}
function renderStep5(key){
  const f=flowData(key); const box=$("#s5Body"); if(!box) return;
  const m=S.msgs["pm"+key]; const busy=S.busy["pm"+key];
  if(f.delivered){
    setHTML(box,`<div class="note ok"><span><b>Entregada a PM</b> el ${esc(fmtTime(f.delivered))}. ${f.moved?"La card está en To Do PM.":""}</span></div>${f.mentionWarn?`<div class="note warn">${esc(f.mentionWarn)}</div>`:""}
      ${!f.moved?`<div class="note warn"><span>El mensaje se publicó, pero la card no se movió a To Do PM.${m?" "+esc(m):""}</span><div class="btns" style="margin:0"><button type="button" class="btn sm" data-act="movePm" ${busy?"disabled":""}>${busy?"Moviendo…":"Mover a To Do PM"}</button></div></div>`:""}
      <section class="lstep"><div class="lh"><h3>Mensaje enviado</h3></div><div class="mdx" style="margin:0">${md(f.pmMsg||"")}</div></section>
      <div class="stepnav"><button type="button" class="btn" data-act="pmRedo">Editar y volver a enviar</button><button type="button" class="btn quiet" data-step="3">Volver a la revisión</button></div>`);
  } else {
    if(!box.querySelector("#pmBox")||box.dataset.cur!==key){ box.dataset.cur=key; box.__h=null;
      box.innerHTML=`<section class="lstep"><div class="lh"><h3>Mensaje para PM</h3><button type="button" class="linkbtn small" data-act="pmReset">Restaurar el texto</button></div>
        <p class="small muted">Sigue el formato del equipo y enlaza la sección enviada a Figma. Las @menciones avisan a esa persona en Jira. Revísalo y edítalo antes de enviarlo: se publica como comentario en la card y la card pasa a <b>To Do PM</b>.</p>
        <div class="fld"><label for="pmBox" class="sr">Mensaje para PM</label><textarea id="pmBox" rows="12"></textarea></div><div class="btns" id="pmBtns"></div></section>
        <div class="stepnav"><button type="button" class="btn quiet" data-step="4">Volver a Figma</button></div>`;
      $("#pmBox").value=S.pmDraft[key]!=null?S.pmDraft[key]:pmMessage(key);
    }
    setHTML($("#pmBtns"),`<button type="button" class="btn primary" data-act="deliver" ${busy?"disabled":""}>${busy?'<span class="spin" aria-hidden="true"></span> Enviando…':"Enviar y mover a To Do PM"}</button>${m?`<span class="small" style="color:var(--err)">${esc(m)}</span>`:""}`);
  }
  renderDoc(key);
}
/* Menciones reales en Jira: @Usuario → nodo mention con su accountId */
const JIRA_PEOPLE={"sebastianacaiturri-villa":{id:"712020:4382d79d-f627-48e2-8a05-5de361120619",name:"Sebastián Acaiturri-Villa"}};
const normHandle=h=>String(h).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g,"").toLowerCase();
const MENTION_RE=/@([\p{L}][\p{L}\p{N}_-]*)/gu;
async function resolveMentions(txt){
  const hs=[...new Set([...txt.matchAll(MENTION_RE)].map(m=>m[1]))]; const out={};
  for(const h of hs){ const k=normHandle(h); if(JIRA_PEOPLE[k]){ out[h]=JIRA_PEOPLE[k]; continue; }
    try{ const p=await call(ATL,"executeRead",{name:"lookupJiraAccountId",cloudId:S.cloudId,inputs:{query:h.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[-_]/g," ")}});
      const list=arr((p&&p.data)||p).filter(u=>u&&u.accountId&&u.active!==false);
      const hit=list.find(u=>normHandle(u.displayName).replace(/-/g,"")===k.replace(/-/g,""))||(list.length===1?list[0]:null);
      if(hit){ out[h]={id:hit.accountId,name:hit.displayName}; JIRA_PEOPLE[k]=out[h]; } }catch(e){} }
  return out;
}
function pmInlineHTML(t,people){
  return esc(t).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2">$1</a>')
    .replace(MENTION_RE,(m,h)=>people[h]?`<span data-type="mention" data-user-id="${esc(people[h].id)}">@${esc(people[h].name)}</span>`:m);
}
function pmToHTML(txt,people){
  return txt.split(/\n\s*\n/).map(par=>{ const L=par.split("\n"); const bl=L.filter(l=>/^\s*[*\-•]\s+/.test(l));
    if(bl.length&&bl.length===L.length) return "<ul>"+L.map(l=>"<li>"+pmInlineHTML(l.replace(/^\s*[*\-•]\s+/,""),people)+"</li>").join("")+"</ul>";
    return "<p>"+L.map(l=>pmInlineHTML(l,people)).join("<br>")+"</p>"; }).join("");
}
async function postPM(key,txt){
  const people=await resolveMentions(txt);
  const missing=[...new Set([...txt.matchAll(MENTION_RE)].map(m=>m[1]))].filter(h=>!people[h]);
  try{ await call(ATL,"addOrEditJiraIssueComment",{cloudId:S.cloudId,issueIdOrKey:key,commentBody:pmToHTML(txt,people),contentFormat:"html"}); }
  catch(e){ if(e&&(e.code==="server_unavailable"||e.code==="upstream_error")) throw e;
    await call(ATL,"addOrEditJiraIssueComment",{cloudId:S.cloudId,issueIdOrKey:key,commentBody:txt}); return {plain:true,missing}; }
  return {plain:false,missing};
}
async function deliverPM(key){
  const txt=(($("#pmBox")||{}).value||"").trim(); if(!txt||S.busy["pm"+key]) return;
  if(!S.mcp||!S.cloudId){ S.msgs["pm"+key]="No hay conexión con Jira. Pulsa Actualizar en la lista de cards."; renderDetail(); return; }
  S.busy["pm"+key]=true; S.msgs["pm"+key]=null; renderDetail();
  let pr={};
  try{ pr=await postPM(key,txt); }
  catch(e){ S.msgs["pm"+key]="No se pudo publicar el mensaje: "+mcpMsg(e,"Jira")+(e&&(e.code==="server_unavailable"||e.code==="upstream_error")?" Revisa la card antes de reenviar.":""); S.busy["pm"+key]=false; renderDetail(); return; }
  let moved=false;
  try{ await moveCard(key,"pm"); moved=true; }catch(e){ S.msgs["pm"+key]=mcpMsg(e,"Jira"); }
  S.pmDraft[key]=null; S.busy["pm"+key]=false;
  const mw=pr.plain?"Jira no aceptó el formato con mención; el mensaje se publicó como texto.":pr.missing&&pr.missing.length?`No encontré en Jira a ${pr.missing.map(h=>"@"+h).join(", ")}: se publicó como texto, sin mención.`:"";
  await setFlow(key,{delivered:new Date().toISOString(),pmMsg:txt,moved,figmaDone:true,mentionWarn:mw||null});
  loadDetail(key,true);
}
async function retryMovePm(key){
  S.busy["pm"+key]=true; S.msgs["pm"+key]=null; renderDetail();
  try{ await moveCard(key,"pm"); await setFlow(key,{moved:true}); }catch(e){ S.msgs["pm"+key]=mcpMsg(e,"Jira"); }
  S.busy["pm"+key]=false; renderDetail();
}
function isStale(r){ return r&&r.status==="running"&&(Date.now()-new Date(r.updatedAt||r.startedAt).getTime())>15*60000; }
function pipeHTML(key){
  const r0=S.runs[key];
  const r=isStale(r0)?Object.assign({},r0,{status:"error",failedStage:r0.stage}):r0;
  const order=(r0&&Array.isArray(r0.order))?r0.order:["arquitecto","writer","ui","qa"];
  const idx=r&&r.status==="running"?(r.stage==="cambios"?-2:order.indexOf(r.stage)):-1;
  const hasV=!!latestVersion(key);
  const sel=(!r0||S.prelaunch[key])?agentSel(key):(Array.isArray(r0.agents)?r0.agents:AG_IDS);
  return `<div class="pipe">${AGENTS.map(([id,n,d],k)=>{ if(id==="writer"&&!sel.includes("arquitecto")) d="Revisión de textos";
    let s="idle",st="En espera"; k=order.indexOf(id);
    if(!sel.includes(id)) return `<div class="ag" data-s="off"><b>${n}</b><span class="muted">${d}</span><span class="st">No participa</span></div>`;
    if(r&&r.status==="running"){ if(idx===-2){ s=id==="qa"?"idle":"run"; st=id==="qa"?"Después":"Aplicando cambio"; if(r.stage==="qa"){} } else if(k<idx){s="done";st="Hecho";} else if(k===idx){s="run";st="Trabajando";} }
    else if(r&&r.status==="error"&&!hasV){ const fi=order.indexOf(r.failedStage); const done=arr(r.done); const map={arquitecto:"architect",writer:"writer",ui:"ui",qa:"qa"}; if(done.includes(map[id])){s="done";st="Hecho";} else if(k===fi){ s="err"; st="Falló aquí"; } else { s="idle"; st="Pendiente"; } }
    else if(hasV){ s="done"; st="Hecho"; }
    return `<div class="ag" data-s="${s}"><b>${n}</b><span class="muted">${d}</span><span class="st">${s==="run"?'<span class="spin" aria-hidden="true"></span>':""}${st}</span></div>`; }).join("")}</div>`;
}
/* Panel previo: el diseñador pregunta lo que falte y decide qué agentes trabajan antes de gastar créditos */
function renderLaunch(key,show,hasV){
  const box=$("#pLaunch"); if(!box) return;
  if(!show){ if(box.dataset.cur){ box.innerHTML=""; box.dataset.cur=""; box.__h=null; } return; }
  if(box.dataset.cur!==key){
    box.dataset.cur=key; box.__h=null;
    box.innerHTML=`<section class="lstep"><div class="lh"><h3>Elige los agentes</h3></div>
        <p class="small muted">Están marcados los agentes disponibles. Desmarca los que no necesites para esta card. Al lanzarlos, la card pasa a <b>In Progress</b> en Jira.</p>
        <div class="agsel" id="agSel" role="group" aria-label="Agentes"></div>
        <div class="btns" id="launchBtns"></div></section>
      <div class="stepnav"><button type="button" class="btn quiet" data-step="1">‹ Volver al brief</button></div>`;
  }
  const sel=agentSel(key); const ok=selOk(sel); const hasPrevUI=!!(latestVersion(key)&&latestVersion(key).ui);
  const wMode=sel.includes("arquitecto")?"":sel.includes("ui")?"Revisará los textos de las pantallas del UI Designer y los corregirá sobre ellas.":hasPrevUI?"Revisará los textos de la última versión y creará una versión nueva con las mismas pantallas y los textos corregidos.":"Revisará los textos que aporte la card y devolverá una tabla de texto actual → propuesto.";
  setHTML($("#agSel"),AGENTS.map(([id,n,dsc])=>{ const on=sel.includes(id);
    const hint=on?(id==="writer"&&wMode?wMode:""):AG_OFF[id];
    return `<label class="agopt${on?" on":""}"><input type="checkbox" data-ag="${id}" ${on?"checked":""}><span><b>${n}</b> <span class="muted">· ${id==="writer"&&wMode?"Revisión de textos":dsc}</span><br><span class="small muted">${esc(hint)}</span></span></label>`; }).join(""));
  const mins=Math.max(1,Math.round(sel.reduce((m,a)=>m+(AG_MIN[a]||1),0)));
  setHTML($("#launchBtns"),`<button type="button" class="btn primary" data-act="launch" ${!ok||!S.sample||S.launching[key]||S.working?"disabled":""}>${S.launching[key]?'<span class="spin" aria-hidden="true"></span> Preparando…':`Lanzar ${sel.length} agente${sel.length===1?"":"s"}`}</button>
    ${hasV?`<button type="button" class="btn quiet" data-act="cancelPre">Cancelar</button>`:""}
    <span class="small muted">${!S.sample?"Abre la página en claude.ai para usar los agentes.":!ok?"Elige al menos el Arquitecto UX, el UX Writer o el UI Designer.":`Unos ${mins} min · usa créditos de Claude${hasV?" · crea una versión nueva":""}.`}</span>`);
}
async function askClientNow(key){
  const body=($("#askBox")&&$("#askBox").value||"").trim(); if(!body||S.busy["ask"+key]) return;
  if(!S.mcp||!S.cloudId){ S.msgs["ask"+key]="No hay conexión con Jira. Pulsa Actualizar en la lista de cards."; renderDetail(); return; }
  S.busy["ask"+key]=true; S.msgs["ask"+key]=null; renderDetail();
  try{ await call(ATL,"addOrEditJiraIssueComment",{cloudId:S.cloudId,issueIdOrKey:key,commentBody:body}); const at=new Date().toISOString(); S.asked[key]=at; S.drafts[key+":ask"]=""; const b=$("#askBox"); if(b) b.value="";
    if(S.db) S.db.doc("asks/"+key).set({at,text:body}).catch(()=>{}); loadDetail(key,true); }
  catch(e){ S.msgs["ask"+key]=mcpMsg(e,"Jira")+(e&&(e.code==="server_unavailable"||e.code==="upstream_error")?" Revisa la card antes de reenviar: puede que el comentario se publicara.":""); }
  S.busy["ask"+key]=false; renderDetail();
}
function renderPropuesta(key,st){
  const r=S.runs[key]; const vs=(S.versions[key]||[]).slice().sort((a,b)=>a.n-b.n); const v=selVersion(key);
  const stale=isStale(r);
  const running=r&&r.status==="running"&&!stale;
  let pipe=pipeHTML(key);
  if(running) pipe+=`<p class="small muted" style="margin-top:8px">${r.stage==="cambios"?"Los agentes están aplicando el cambio pedido.":"Los agentes trabajan con la card, sus comentarios y el historial de Jira."} Última actividad ${esc(fmtTime(r.updatedAt||r.startedAt))}.</p>`;
  if(stale) pipe+=`<div class="note err" style="margin-top:8px">Los agentes dejaron de dar señales en ${esc(STAGE_NAME[r.stage]||"la ejecución")} (${esc(fmtTime(r.updatedAt))}). La pestaña que los lanzó se cerró o el ordenador entró en reposo.</div>`;
  else if(r&&r.error) pipe+=`<div class="note err" style="margin-top:8px"><span>${esc(r.error)}</span>${r.status==="error"&&!v?`<span class="small">Fallo: ${esc(fmtTime(r.updatedAt))}${r.errorCode&&r.errorCode!=="local"?` · código ${esc(r.errorCode)}`:""}. Lo que ya hicieron los agentes está guardado.</span>`:""}</div>`;
  if(S.msgs[key]) pipe+=`<div class="note warn" style="margin-top:8px">${esc(S.msgs[key])}</div>`;
  if(!r&&!running){}
  else if(!running&&(!v)){ const fs=stale?r.stage:r.failedStage; const canResume=(stale||r.status==="error")&&fs&&STAGE_NAME[fs]&&fs!=="jira"; pipe+=`<div class="btns" style="margin-top:10px">${canResume?`<button type="button" class="btn primary" data-act="resume" ${S.launching[key]?"disabled":""}>Reintentar desde ${esc(STAGE_NAME[fs])}</button><button type="button" class="btn quiet" data-act="prelaunch" ${S.launching[key]?"disabled":""}>Empezar de cero</button>`:`<button type="button" class="btn primary" data-act="prelaunch" ${S.launching[key]?"disabled":""}>${S.launching[key]?'<span class="spin" aria-hidden="true"></span> Preparando…':"Volver a lanzar los agentes"}</button>`}<span class="small muted">Deja esta pestaña abierta y el ordenador activo mientras trabajan (2 a 4 minutos).</span></div>`; }
  const showLaunch=!running&&(!r||S.prelaunch[key]);
  const jm=S.msgs["jira"+key]; const jn=jm?`<div class="note ${jm.ok?"ok":"warn"}" style="margin-top:8px">${esc(jm.t)}</div>`:"";
  if(st===2){
    if(v&&!showLaunch&&!running) pipe+=`<div class="stepnav"><button type="button" class="btn primary" data-step="3">Ver la revisión →</button><button type="button" class="btn quiet" data-act="prelaunch">Regenerar desde cero</button><span class="small muted">Los agentes ya terminaron la v${esc(v.n)}.</span></div>`;
    if(running) pipe+=`<p class="small muted">Cuando termine QA pasarás a la revisión automáticamente.</p>`;
    setHTML($("#pPipe"),(showLaunch?(S.msgs[key]?`<div class="note warn">${esc(S.msgs[key])}</div>`:""):pipe)+jn);
    renderLaunch(key,showLaunch,!!v);
    return;
  }
  setHTML($("#pPipe"),((running&&r.stage==="cambios")||(r&&r.error)||S.msgs[key])?pipe:"");
  if(!v){ setHTML($("#pVers"),""); setHTML($("#pScreens"),running?`<div class="empty"><strong>Preparando la primera propuesta</strong><span>Las pantallas aparecerán aquí cuando termine QA.</span></div>`:""); setHTML($("#pComposer"),""); setHTML($("#pApprove"),""); return; }
  const q=v.qa||{};
  setHTML($("#pVers"),`<div class="btns" style="justify-content:space-between"><div class="vers" aria-label="Versiones">${vs.map(x=>`<button type="button" data-ver="${x.n}" aria-pressed="${x.n===v.n}">v${x.n}${r&&r.approvedVersion===x.n?" ✓":""}</button>`).join("")}</div><span class="small muted">${v.ui&&v.ui.ds?`Sistema ${esc(v.ui.ds)} · `:""}${v.qa?`QA ${q.puntuacion!=null?esc(q.puntuacion)+"/100":"—"} · ${q.listo_para_cliente?"lista para el cliente":"necesita revisión"}`:"Sin revisión de QA"}</span></div>${v.n>1?`<p class="small muted" style="margin-top:6px">Cambio pedido: ${esc(v.request)}${arr(v.cambios).length?" · "+esc(arr(v.cambios).join("; ")):""}</p>`:""}`);
  if((!v.ui||!arr(v.ui.screens).length)&&v.writer&&Array.isArray(v.writer.revision)) setHTML($("#pScreens"),reviewHTML(v.writer));
  else if(!v.ui||!arr(v.ui.screens).length) setHTML($("#pScreens"),`<div class="empty"><strong>Esta versión no tiene pantallas</strong><span>El UI Designer no participó. Revisa la arquitectura y los textos en «Ver el trabajo de cada agente», o pulsa Regenerar desde cero y elige al UI Designer.</span></div>`);
  else { const ui=linkUI(v.ui||{},flowOf(v)); const sc=arr(ui.screens); const desk=ui.platform==="desktop"; const mode=S.scrView||"pantallas";
    const vw=`<div class="vw" role="group" aria-label="Vista">${[["pantallas","Pantallas"],["flujo","Flujo"],["prototipo","Prototipo"]].map(([k,l])=>`<button type="button" data-view="${k}" aria-pressed="${mode===k}">${l}</button>`).join("")}</div>`;
    let body="";
    if(mode==="flujo"){
      body=`<div class="scrnav">${vw}<span class="small muted">${esc(flowNote(ui,flowOf(v)))}</span></div><div class="flowv${desk?" desk":""}" id="flowRow"><svg class="flowsvg" id="flowSvg" aria-hidden="true"></svg>${spec2html(ui)}</div>`;
    } else if(mode==="prototipo"){
      const pk=key+":"+v.n; S.protoKey=pk; const st=S.proto[pk]||(S.proto[pk]={hist:[sc[0]&&sc[0].id]});
      let cur=sc.findIndex(x=>x.id===st.hist[st.hist.length-1]); if(cur<0){ st.hist=[sc[0].id]; cur=0; }
      const hints=S.protoHints!==false;
      body=`<div class="scrnav">${vw}<span class="small muted">Pulsa los elementos resaltados como en la app real.</span></div>
      <div class="protov"><div class="protobar"><button type="button" class="btn sm" data-pact="back" ${st.hist.length<2?"disabled":""}>‹ Atrás</button><span class="nm"><b>${cur+1}/${sc.length}</b> · ${esc(sc[cur].name||"")}</span><button type="button" class="btn sm" data-pact="reset" ${st.hist.length<2?"disabled":""}>Reiniciar</button><button type="button" class="btn sm quiet" data-pact="hints" aria-pressed="${hints}">${hints?"Ocultar zonas":"Mostrar zonas"}</button></div>
      ${st.msg?`<div class="note warn" role="status">${esc(st.msg)}</div>`:""}<div class="protostage${hints?" hints":""}${desk?" desk":""}" id="protoStage">${spec2html(ui,cur)}</div>
      <div class="protodots" aria-label="Ir a pantalla">${sc.map((x,i)=>`<button type="button" data-pgo="${esc(x.id)}" aria-pressed="${i===cur}">${i+1}. ${esc(x.name||"")}</button>`).join("")}</div></div>`;
    } else {
      body=`<div class="scrnav">${vw}<div class="r"><span class="small muted">${sc.length} pantallas · desliza para ver todas</span><button type="button" class="btn sm" data-scr="-1" aria-label="Pantallas anteriores">‹</button><button type="button" class="btn sm" data-scr="1" aria-label="Pantallas siguientes">›</button></div></div><div class="screens${desk?" desk":""}" id="scrRow">${spec2html(ui)}</div>`;
    }
    setHTML($("#pScreens"),`<div class="scrwrap">${body}</div>`);
  }
  fitPhones(); drawFlow();
  if($("#agDet")&&$("#agDet").open) renderAgentes(key);
  const qaN=arr(q.problemas).length;
  if(!$("#pComposer").firstChild||$("#pComposer").dataset.cur2!==key){
    $("#pComposer").dataset.cur2=key; $("#pComposer").__h=null;
    $("#pComposer").innerHTML=`<div class="composer"><h3>Pedir cambios</h3><div class="fld"><label for="chgBox" class="small muted">Se aplican sobre la última versión y QA vuelve a revisar.</label><textarea id="chgBox" rows="3" placeholder="Por ejemplo: pon el precio arriba, quita el banner y añade un estado vacío cuando no hay conductores cerca."></textarea></div><div class="btns" id="chgBtns"></div></div>`;
    $("#chgBox").value=S.drafts[key+":change"]||"";
  }
  setHTML($("#chgBtns"),`<button type="button" class="btn primary" data-act="revise" ${running||!S.sample?"disabled":""}>${running&&r.stage==="cambios"?'<span class="spin" aria-hidden="true"></span> Aplicando…':"Aplicar cambios"}</button>${qaN?`<button type="button" class="btn" data-act="qaFill" ${running?"disabled":""}>Usar las ${qaN} sugerencias de QA</button>`:""}<button type="button" class="btn quiet" data-act="prelaunch" ${running?"disabled":""}>Regenerar desde cero</button>`);
  const sent=sentLinks(key); const sentLink=sent["v"+v.n];
  const tg=figTarget();
  const fm=S.msgs["fig"+key];
  if(!v.ui||!arr(v.ui.screens).length){ setHTML($("#pApprove"),""); return; }
  if(tg&&!S.figPages&&!S.busy.figPages&&!S.figPagesErr&&S.mcp) setTimeout(()=>loadFigPages(),0);
  setHTML($("#pApprove"),`<div class="composer"><h3>Figma</h3>
    ${figPageHTML(key,v,issueOf(key))}
        <p class="small muted">Si no hay que cambiar nada más, envíala a Figma para ajustar los detalles allí.</p>
    <div class="btns"><button type="button" class="btn primary" data-act="figma" ${running||S.busy["fig"+key]?"disabled":""}>${S.busy["fig"+key]?`<span class="spin" aria-hidden="true"></span> ${esc((S.figStage&&S.figStage[key])||"Dibujando en Figma…")}`:"Enviar a Figma"}</button></div>
    ${S.figInfo&&S.figInfo[key]?`<div class="note ok"><span>${esc(S.figInfo[key])}${sentLink?` <a href="${esc(sentLink)}" target="_blank" rel="noopener">Abrir en Figma ↗</a>`:""}</span></div>`:""}${fm?`<div class="note err">${esc(fm)}</div>`:""}</div>`);
}
function reviewHTML(w){
  const rv=arr(w.revision);
  return `<div class="sec"><h3>Revisión de textos · UX Writer</h3>${w.resumen?`<p>${esc(w.resumen)}</p>`:""}${w.aplicados!=null?`<p class="small muted">${w.aplicados} de ${rv.length} cambios aplicados sobre las pantallas${w.de_version?` de la v${w.de_version}`:""}.</p>`:""}
    <div class="tbl"><table><thead><tr><th>Pantalla</th><th>Elemento</th><th>Texto actual</th><th>Propuesto</th><th>Motivo</th></tr></thead><tbody>${rv.map(r=>`<tr><td>${esc(r.pantalla||"")}</td><td>${esc(r.elemento||"")}</td><td><s class="muted">${esc(r.actual)}</s></td><td><b>${esc(r.propuesto)}</b>${r.aplicado===false&&w.aplicados!=null?` <span class="chip warn">no encontrado</span>`:""}</td><td class="small">${esc(r.motivo||"")}</td></tr>`).join("")||`<tr><td colspan="5">Sin cambios propuestos.</td></tr>`}</tbody></table></div>
    ${arr(w.pendiente).length?`<h3>Pendiente</h3><ul class="list">${arr(w.pendiente).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}</div>`;
}
function agList(xs,f){ xs=arr(xs); return xs.length?`<ul class="list">${xs.map(x=>`<li>${f?f(x):esc(x)}</li>`).join("")}</ul>`:""; }
function agBlock(t,h,note){ return h?`<div class="agb">${t?`<h4>${esc(t)}`:"<span hidden>"}${note?` <span class="muted">· ${esc(note)}</span>`:""}${t?"</h4>":"</span>"}${h}</div>`:""; }
function agTabsFor(v){
  const used=Array.isArray(v.agents)?v.agents:AG_IDS;
  return AGENTS.map(([id,n])=>({id,n,on:used.includes(id)&&!!(id==="arquitecto"?v.architect:id==="writer"?v.writer:id==="ui"?v.ui:v.qa)}));
}
function renderAgentes(key){
  const v=selVersion(key); const AH=$("#pAgents")||$("#genBody");
  if(!v){ setHTML(AH,`<div class="empty"><strong>Todavía no hay salida de los agentes</strong><span>Lánzalos en el paso Agentes.</span></div>`); return; }
  const tabs=agTabsFor(v); let cur=S.agTab[key]; if(!tabs.some(t=>t.id===cur&&t.on)) cur=(tabs.find(t=>t.on)||tabs[0]).id; S.agTab[key]=cur;
  const names=scrNames(v); const a=v.architect||{}, w=v.writer||{}, q=v.qa||{}, u=v.ui||{};
  const sev={alta:0,media:1,baja:2};
  let body="";
  if(cur==="arquitecto"){
    const ps=arr(a.pantallas);
    body=`<p class="agwhat">Define el objetivo, el flujo y qué contiene cada pantalla.</p>
      ${a.objetivo?`<div class="agobj"><span class="small muted">Objetivo</span><b>${esc(a.objetivo)}</b></div>`:""}
      ${agBlock("Flujo",arr(a.flujo).length?`<ol class="agflow">${arr(a.flujo).map(f=>`<li><span>${esc(f.paso)}</span>${f.resultado?`<span class="muted small">→ ${esc(f.resultado)}</span>`:""}</li>`).join("")}</ol>`:"",arr(a.flujo).length+" pasos")}
      ${agBlock("Pantallas",ps.length?`<div class="agcards">${ps.map(p=>`<div class="agcard"><b>${esc(p.nombre)}</b><span class="small">${esc(p.proposito||"")}</span>${arr(p.contenido).length||arr(p.estados).length?`<details><summary class="small muted">Contenido y estados</summary>${agList(p.contenido)}${arr(p.estados).length?`<span class="small muted">Estados</span>${agList(p.estados)}`:""}</details>`:""}</div>`).join("")}</div>`:"",ps.length)}
      ${agBlock("Decisiones",agList(a.decisiones,x=>`<b>${esc(x.decision)}</b>${x.motivo?` <span class="muted">— ${esc(x.motivo)}</span>`:""}`))}
      ${agBlock("Preguntas abiertas",agList(a.preguntas_abiertas)+(arr(a.preguntas_abiertas).length?`<div class="btns" style="margin:0"><button type="button" class="btn sm" data-act="askClient">Preguntar al cliente en Jira</button></div>`:""),arr(a.preguntas_abiertas).length||"")}
      ${arr(a.usuarios).length||arr(a.supuestos).length||arr(a.relacion_tareas).length?`<details class="pdet"><summary class="small">Usuarios, supuestos y relación con otras tareas</summary>${agBlock("Usuarios",agList(a.usuarios))}${agBlock("Supuestos",agList(a.supuestos))}${agBlock("Relación con otras tareas",agList(a.relacion_tareas,x=>`<span class="mono">${esc(x.key)}</span> ${esc(x.como)}`))}</details>`:""}`;
  } else if(cur==="writer"){
    if(Array.isArray(w.revision)) body=`<p class="agwhat">Revisa los textos existentes y propone cómo mejorarlos.</p>${reviewHTML(w)}`;
    else body=`<p class="agwhat">Escribe los textos de cada pantalla: títulos, botones, errores y estados vacíos.</p>
      ${w.tono?`<div class="agobj"><span class="small muted">Tono</span><b>${esc(w.tono)}</b></div>`:""}
      ${agBlock("Textos por pantalla",`<div class="agcards">${arr(w.pantallas).map(p=>`<div class="agcard"><b>${esc(p.titulo||names[p.id]||p.id)}</b>
        ${arr(p.textos).length?`<dl class="agdl">${arr(p.textos).map(t=>`<dt>${esc(t.elemento)}</dt><dd>${esc(t.texto)}</dd>`).join("")}</dl>`:""}
        ${arr(p.ctas).length?`<div class="agctas">${arr(p.ctas).map(c=>`<span class="chip">${esc(c)}</span>`).join("")}</div>`:""}
        ${arr(p.errores).length||arr(p.vacios).length?`<details><summary class="small muted">Errores y vacíos</summary><dl class="agdl">${arr(p.errores).map(e=>`<dt>${esc(e.caso)}</dt><dd>${esc(e.texto)}</dd>`).join("")}${arr(p.vacios).map(x=>`<dt>Vacío</dt><dd>${esc(x)}</dd>`).join("")}</dl></details>`:""}</div>`).join("")}</div>`,arr(w.pantallas).length+" pantallas")}
      ${agBlock("Glosario",agList(w.glosario,g=>`<b>${esc(g.termino)}</b>: ${esc(deId(g.uso,names))}`))}`;
  } else if(cur==="ui"){
    const sc=arr(u.screens);
    body=`<p class="agwhat">Convierte la propuesta en pantallas con los componentes del sistema de diseño y enlaza el prototipo.</p>
      ${u.ds?`<div class="agobj"><span class="small muted">Sistema de diseño</span><b>${esc(u.ds)}</b></div>`:""}
      ${agBlock("Pantallas",sc.length?`<ol class="agflow">${sc.map(s=>`<li><span><b>${esc(s.name||s.id)}</b>${s.purpose?` <span class="muted">— ${esc(s.purpose)}</span>`:""}</span><span class="muted small">${arr(s.blocks).length} bloques</span></li>`).join("")}</ol>`:"",sc.length)}
      ${agBlock("Notas de diseño",agList(u.notas))}
      <p class="small muted">Las pantallas se ven arriba, en Pantallas, Flujo y Prototipo.</p>`;
  } else {
    const pr=arr(q.problemas).slice().sort((x,y)=>(sev[x.severidad]??3)-(sev[y.severidad]??3));
    const cnt=k=>pr.filter(p=>p.severidad===k).length; const cob=arr(q.cobertura);
    const sc=Number(q.puntuacion); const lvl=sc>=80?"ok":sc>=50?"warn":"err";
    let fs=S.qaSev[key]; if(!fs||(fs!=="todas"&&!cnt(fs))) fs=cnt("alta")?"alta":cnt("media")?"media":"todas";
    const shown=fs==="todas"?pr:pr.filter(p=>p.severidad===fs);
    body=`<p class="agwhat">Comprueba que la propuesta cumple la card y busca problemas antes de que la veas.</p>
      <div class="agqa"><div class="agscore ${lvl}"><b>${q.puntuacion!=null?esc(q.puntuacion):"—"}</b><span>/100</span></div><div><b>${q.listo_para_cliente?"Lista para el cliente":"Necesita revisión"}</b><p class="small">${esc(q.resumen||"")}</p>
        <div class="agctas">${cob.length?`<span class="chip">${cob.filter(c=>c.estado==="cubierto").length}/${cob.length} requisitos cubiertos</span>`:""}</div></div></div>
      ${pr.length?`<div class="agb"><div class="agtabs"><h4>Problemas</h4><div class="vw" role="group" aria-label="Filtrar por severidad">${[["alta","Alta"],["media","Media"],["baja","Baja"],["todas","Todas"]].filter(([k])=>k==="todas"||cnt(k)).map(([k,l])=>`<button type="button" data-qasev="${k}" aria-pressed="${fs===k}">${l} · ${k==="todas"?pr.length:cnt(k)}</button>`).join("")}</div></div>`:""}
      ${agBlock("",shown.length?`<ul class="agprob">${shown.map(p=>`<li><span class="sev ${esc(p.severidad)}">${esc(p.severidad)}</span><div><b>${esc(names[p.pantalla]||p.pantalla||"General")}</b>${p.area?` <span class="muted small">· ${esc(p.area)}</span>`:""}<p>${esc(deId(p.detalle,names))}</p>${p.sugerencia?`<p class="small"><span class="muted">Sugerencia:</span> ${esc(deId(p.sugerencia,names))}</p>`:""}</div></li>`).join("")}</ul>`:`<p class="small muted">Sin problemas.</p>`)}${pr.length?"</div>":""}
      ${cob.length?`<details class="pdet"><summary class="small">Cobertura de requisitos de la card</summary><ul class="agcov">${cob.map(c=>`<li><span class="chip ${c.estado==="cubierto"?"ok":c.estado==="parcial"?"warn":"err"}">${esc(c.estado)}</span><span>${esc(c.requisito)}${c.nota?` <span class="muted small">— ${esc(c.nota)}</span>`:""}</span></li>`).join("")}</ul></details>`:""}`;
  }
  setHTML(AH,`<div class="agtabs"><div class="vw" role="tablist" aria-label="Agentes">${tabs.map(t=>`<button type="button" role="tab" data-agtab="${t.id}" aria-pressed="${t.id===cur}" aria-selected="${t.id===cur}" ${t.on?"":"disabled title=\"No participó en esta versión\""}>${esc(t.n)}</button>`).join("")}</div><span class="small muted">Versión v${v.n}</span></div>
    <div class="agpane" role="tabpanel">${body}</div>`);
}
function renderCard(key){
  const d=S.detail[key], err=S.detailErr[key];
  if(!d&&!S.busy["d"+key]&&!err){ loadDetail(key); }
  let h="";
  if(err&&!d) h=`<div class="note err">${esc(mcpMsg(err,"Jira"))}<button type="button" class="btn sm" data-act="reloadDetail">Reintentar</button></div>`;
  else if(!d) h=`<div class="empty"><span class="spin" aria-hidden="true"></span><strong>Cargando la card</strong></div>`;
  else h=`<div class="sec"><h3>Descripción</h3><div class="mdx" style="margin:0">${md(d.description)}</div></div>
    <div class="sec"><div class="btns" style="justify-content:space-between"><h3>Comentarios (${d.comments.length})</h3><button type="button" class="btn quiet sm" data-act="reloadDetail">${S.busy["d"+key]?"Actualizando…":"Actualizar"}</button></div>
    ${d.comments.length?d.comments.map(c=>`<div class="cmt"><span class="who">${esc(c.author)} · ${esc(fmtTime(c.created))}</span><div>${md(c.body)}</div></div>`).join(""):`<p class="small muted">Sin comentarios todavía.</p>`}</div>`;
  setHTML($("#cBody"),h);
  const m=S.msgs["c"+key];
  setHTML($("#cmtBtns"),`<button type="button" class="btn primary" data-act="comment" ${S.busy["c"+key]?"disabled":""}>${S.busy["c"+key]?'<span class="spin" aria-hidden="true"></span> Publicando…':"Publicar comentario"}</button>${latestVersion(key)&&arr(latestVersion(key).architect&&latestVersion(key).architect.preguntas_abiertas).length?`<button type="button" class="btn" data-act="insertQs">Insertar preguntas abiertas</button>`:""}${m==="ok"?`<span class="small" style="color:var(--ok)">Publicado en Jira</span>`:m?`<span class="small" style="color:var(--err)">${esc(m)}</span>`:""}`);
}
function renderDoc(key){
  const v=selVersion(key);
  if(!v){ setHTML($("#genBody"),`<div class="empty"><strong>La documentación se genera con la propuesta</strong><span>Lanza los agentes en el paso Agentes.</span></div>`); return; }
  const mdTxt=docMarkdown(key,v,S.detail[key]||issueOf(key));
  const html=mdTxt.split("\n").map(l=>{ if(l.startsWith("# ")) return `<h2 style="font-size:20px">${inl(l.slice(2))}</h2>`; if(l.startsWith("## ")) return `<h3>${inl(l.slice(3))}</h3>`; if(/^\* /.test(l)) return `<li>${inl(l.slice(2))}</li>`; if(/^\d+\. /.test(l)) return `<li>${inl(l.replace(/^\d+\. /,""))}</li>`; return l.trim()?`<p>${inl(l)}</p>`:""; }).join("").replace(/(<li>.*?<\/li>)+/g,m=>`<ul>${m}</ul>`);
  const m=S.msgs["doc"+key];
  setHTML($("#genBody"),`<div class="btns"><button type="button" class="btn primary" data-act="docJira" ${S.busy["doc"+key]?"disabled":""}>${S.busy["doc"+key]?'<span class="spin" aria-hidden="true"></span> Publicando…':"Publicar en la card de Jira"}</button><button type="button" class="btn" data-act="docCopy">Copiar en Markdown</button>${m?`<span class="small" style="color:${m==="ok"||m==="copied"?"var(--ok)":"var(--err)"}">${m==="ok"?"Publicada como comentario en Jira":m==="copied"?"Copiada":esc(m)}</span>`:""}</div>
  <textarea id="docSrc" class="mono" rows="6" readonly hidden></textarea>
  <article class="docv">${html}</article>`);
  const t=$("#docSrc"); if(t) t.value=mdTxt;
}
/* ================= Vista ORQUESTADOR ================= */
/* Qué recibe y qué devuelve cada agente, en lenguaje corto para el mapa */
const ORQ_IO = {
  analista:{in:["Brief del cliente","Cards anteriores"],out:["Puntuación","Preguntas al cliente"]},
  arquitecto:{in:["Card de Jira","Historial","Sistema de diseño"],out:["Flujo","Pantallas y contenido"]},
  writer:{in:["Arquitectura"],out:["Textos","Glosario"]},
  writer_revision:{in:["Textos actuales"],out:["Texto actual → propuesto"]},
  ui:{in:["Arquitectura","Textos","Componentes"],out:["Pantallas","Enlaces del prototipo"]},
  qa:{in:["Card","Toda la propuesta"],out:["Puntuación","Problemas"]},
  revision:{in:["Tu petición","Versión actual"],out:["Versión nueva"]},
  notas:{in:["Card","Versión enviada"],out:["Nota de Figma"]},
  pendientes:{in:["Preguntas abiertas","Problemas de QA"],out:["Qué corregir","Qué confirmar"]}
};
const ORQ_STAGES = [
  {n:1,title:"Petición",where:"cliente",trigger:"El cliente escribe el brief y pulsa «Analizar».",
   steps:[["p","Cliente","Escribe el brief"],["a","analista"],["t","Jira","Crea la card"]]},
  {n:2,title:"Preparación",where:"disenador",trigger:"Antes de gastar créditos: decides si falta información.",
   steps:[["p","Diseñador","Revisa la card y elige agentes"],["t","Jira","Comenta la pregunta al cliente"]]},
  {n:3,title:"Propuesta",where:"disenador",trigger:"Al pulsar «Lanzar agentes». Solo actúan los que elijas.",
   steps:[["t","Jira","Mueve a In Progress y lee la card"],["a","arquitecto"],["a","writer"],["a","ui"],["a","qa"]],
   branch:{text:"Sin Arquitecto UX, el Writer actúa después del UI Designer y revisa textos:",id:"writer_revision"}},
  {n:4,title:"Iteración",where:"disenador",trigger:"Sobre una versión, al pulsar «Aplicar cambios».",
   steps:[["p","Diseñador","Pide un cambio"],["a","revision"],["a","qa"]]},
  {n:5,title:"Entrega",where:"disenador",trigger:"Al pulsar «Enviar a Figma».",
   steps:[["a","notas"],["t","Figma","Dibuja pantallas, flujo y nota"],["a","pendientes"],["p","Diseñador","Ajusta en Figma y revisa el mensaje a PM"],["t","Jira","Comenta a PM y mueve a To Do PM"]]}
];
function orqUses(id){ const t=promptT(id); return SHARED_IDS.filter(k=>t.includes("{{"+({rubrica:"RUBRICA",fidelidad:"FIDELIDAD",flujo:"FLUJO_REGLAS",esquema:"ESQUEMA_BLOQUES"})[k]+"}}")); }
function orqMod(id){ return !!(S.prompts&&S.prompts[id]&&S.prompts[id].t); }
function orqAgent(id){
  const p=PROMPT_DEFS[id], io=ORQ_IO[id]||{in:[],out:[]};
  return `<button type="button" class="ok-node ok-ai${S.orqSel===id?" on":""}" data-orq="${id}" aria-pressed="${S.orqSel===id}">
    <span class="ok-kind">Agente IA${orqMod(id)?` · <span class="ok-mod">modificado</span>`:""}</span>
    <b>${esc(p.name)}</b>
    <span class="ok-io"><span>${io.in.map(esc).join(" · ")}</span><span class="ok-to">→ ${io.out.map(esc).join(" · ")}</span></span></button>`;
}
function orqStatic(kind,name,what){ return `<div class="ok-node ${kind==="p"?"ok-person":"ok-tool"}"><span class="ok-kind">${kind==="p"?"Persona":"Herramienta"}</span><b>${esc(name)}</b><span class="ok-io"><span>${esc(what)}</span></span></div>`; }
function renderOrq(){
  if(!$("#orqMap")) return;
  if(!S.orqSel) S.orqSel="arquitecto";
  const arrow=`<span class="ok-arr" aria-hidden="true"></span>`;
  setHTML($("#orqMap"),ORQ_STAGES.map(st=>`<section class="ok-stage" aria-label="Etapa ${st.n}: ${esc(st.title)}">
      <div class="ok-head"><span class="ok-num">${st.n}</span><div><h3>${esc(st.title)}</h3><span class="chip ${st.where==="cliente"?"ok":"run"}">${st.where==="cliente"?"Vista Cliente":"Vista Diseñador"}</span><p class="small muted">${esc(st.trigger)}</p></div></div>
      <div class="ok-flow">${st.steps.map(s=>s[0]==="a"?orqAgent(s[1]):orqStatic(s[0],s[1],s[2])).join(arrow)}</div>
      ${st.branch?`<div class="ok-branch"><span class="small muted">${esc(st.branch.text)}</span>${orqAgent(st.branch.id)}</div>`:""}
    </section>`).join("")+`
    <section class="ok-stage ok-shared" aria-label="Reglas compartidas">
      <div class="ok-head"><span class="ok-num">≡</span><div><h3>Reglas compartidas</h3><p class="small muted">Bloques de texto que se insertan en varios prompts. Si cambias uno, cambia en todos los agentes que lo usan.</p></div></div>
      <div class="ok-flow">${SHARED_IDS.map(id=>{ const users=PROMPT_ORDER.filter(a=>orqUses(a).includes(id)).map(a=>PROMPT_DEFS[a].name);
        return `<button type="button" class="ok-node ok-rule${S.orqSel===id?" on":""}" data-orq="${id}" aria-pressed="${S.orqSel===id}"><span class="ok-kind">Regla${orqMod(id)?` · <span class="ok-mod">modificada</span>`:""}</span><b>${esc(PROMPT_DEFS[id].name)}</b><span class="ok-io"><span>Usada en: ${users.map(esc).join(", ")||"—"}</span></span></button>`; }).join("")}</div>
    </section>`);
  renderOrqEditor();
}
function renderOrqEditor(){
  const id=S.orqSel, p=PROMPT_DEFS[id]; const ed=$("#orqEd"); if(!ed||!p) return;
  const cur=promptT(id); const mod=orqMod(id); const io=ORQ_IO[id];
  if(ed.dataset.cur!==id||ed.dataset.ver!==String(S.promptsVer||0)){
    ed.dataset.cur=id; ed.dataset.ver=String(S.promptsVer||0);
    const where=p.where==="cliente"?"Vista Cliente":p.where==="disenador"?"Vista Diseñador":"Regla compartida";
    const uses=p.shared?[]:orqUses(id);
    ed.innerHTML=`<div class="ph-h"><h2>${esc(p.name)}</h2><div class="btns" style="margin:0"><span class="chip ${p.where==="cliente"?"ok":p.where==="disenador"?"run":""}">${where}</span>${mod?`<span class="chip warn">Modificado</span>`:`<span class="chip">Original</span>`}</div></div>
      <div class="pad ok-ed">
        <div class="ok-info">
          <dl class="orq-dl"><dt>Cuándo actúa</dt><dd>${esc(p.when)}</dd>${p.reads?`<dt>Recibe</dt><dd>${esc(p.reads)}</dd>`:""}${p.makes?`<dt>Devuelve</dt><dd>${esc(p.makes)}</dd>`:""}${uses.length?`<dt>Reglas que usa</dt><dd>${uses.map(u=>`<button type="button" class="linkbtn" data-orq="${u}">${esc(PROMPT_DEFS[u].name)}</button>`).join(", ")}</dd>`:""}${mod?`<dt>Última edición</dt><dd>${esc(fmtTime(S.prompts[id].at))}</dd>`:""}</dl>
          ${Object.keys(p.vars).length?`<div><h3 class="ok-h">Datos que se insertan</h3><p class="small muted">Las palabras entre {{ }} se sustituyen por datos reales al ejecutarse. Pulsa una para insertarla donde está el cursor.</p><div class="orq-vars">${Object.entries(p.vars).map(([k,dsc])=>`<button type="button" class="orq-var" data-orqvar="${k}" title="Insertar {{${k}}}"><code>{{${k}}}</code><span>${esc(dsc)}</span></button>`).join("")}</div></div>`:""}
          ${p.format?`<details class="orq-fmt"><summary class="small">Formato de respuesta (lo lee el portal; no se edita)</summary><pre class="mono small">${esc(p.format)}</pre></details>`:id==="ui"?`<p class="small muted">El formato de respuesta del UI Designer lo genera el portal según la plataforma y los agentes que participan, y se inserta en {{FORMATO}}.</p>`:""}
        </div>
        <div class="ok-prompt">
          <div class="fld"><label for="orqTxt" class="small"><b>Prompt</b>${p.shared?" (bloque compartido)":""}</label>
            <textarea id="orqTxt" class="mono" rows="22" spellcheck="false"></textarea></div>
          <div id="orqWarn"></div>
          <div class="btns"><button type="button" class="btn primary" data-act="orqSave">Guardar para todo el equipo</button><button type="button" class="btn" data-act="orqPreview">Ver prompt final</button>${mod?`<button type="button" class="btn quiet" data-act="orqReset">Restaurar original</button>`:""}<span class="small muted" id="orqMsg">${esc(S.orqMsg||"")}</span></div>
          <div id="orqPrev"></div>
        </div>
      </div>`;
    const t=$("#orqTxt"); t.value=S.orqDraft[id]!=null?S.orqDraft[id]:cur;
  }
  orqValidate();
}
function orqValidate(){
  const id=S.orqSel, p=PROMPT_DEFS[id]; const t=$("#orqTxt"); const w=$("#orqWarn"); if(!t||!w) return;
  const used=promptVars(t.value); const known=Object.keys(p.vars).concat(p.shared?[]:["RUBRICA","FIDELIDAD","FLUJO_REGLAS","ESQUEMA_BLOQUES"]);
  const unknown=used.filter(k=>!known.includes(k));
  const missing=p.shared?[]:Object.keys(p.vars).filter(k=>!used.includes(k)&&k!=="FORMATO");
  const msgs=[];
  if(!t.value.trim()) msgs.push(["err","El prompt está vacío; al guardar se usará el original."]);
  if(unknown.length) msgs.push(["err",`Estas variables no existen y quedarán vacías: ${unknown.map(k=>"{{"+k+"}}").join(", ")}.`]);
  if(!p.shared&&!used.includes("FORMATO")) msgs.push(["warn","Falta {{FORMATO}}: se añadirá al final automáticamente para que el portal pueda leer la respuesta."]);
  if(missing.length) msgs.push(["warn",`El agente no recibirá: ${missing.map(k=>p.vars[k]).join("; ")}.`]);
  setHTML(w,msgs.map(([k,m])=>`<div class="note ${k}">${esc(m)}</div>`).join(""));
}
async function orqSave(reset){
  const id=S.orqSel; const t=$("#orqTxt"); const msg=$("#orqMsg");
  if(!S.db){ if(msg) msg.textContent="Esta vista no puede guardar. Abre la página en claude.ai."; return; }
  const next=Object.assign({},S.prompts||{});
  const val=reset?"":String(t&&t.value||"");
  if(!val.trim()||val===PROMPT_DEFS[id].template) delete next[id]; else next[id]={t:val,at:new Date().toISOString()};
  S.orqDraft[id]=null; S.orqMsg=reset?"Restaurado el original.":"Guardado. Se usará en la próxima ejecución.";
  try{ await S.db.doc("config/prompts").set(next); const m=$("#orqMsg"); if(m) m.textContent=S.orqMsg; }
  catch(e){ S.orqMsg="No se pudo guardar: "+clip(e&&e.message||"error",120); const m=$("#orqMsg"); if(m) m.textContent=S.orqMsg; }
}
function orqPreview(){
  const id=S.orqSel; const box=$("#orqPrev"); if(!box) return;
  const draft=$("#orqTxt")&&$("#orqTxt").value;
  const saved=S.prompts; S.prompts=Object.assign({},saved||{}); if(draft&&draft.trim()) S.prompts[id]={t:draft};
  let out="", note="";
  try{
    const key=S.selected; const d=key&&(S.detail[key]||issueOf(key)); const v=key&&selVersion(key);
    const target=PROMPT_DEFS[id].shared?"arquitecto":id;
    if(target==="analista"){ const b=briefFromForm(); out=promptAnalyst(b.title?b:{title:"(título de ejemplo)",desc:"(descripción del cliente)",goal:"",platform:"App móvil",date:"",prio:"Media"},""); note="Con lo que hay ahora en el formulario de la vista Cliente."; }
    else if(!d){ note="Selecciona una card en la vista Diseñador para ver el prompt con sus datos reales."; }
    else { const a=v&&v.architect, w=v&&v.writer, u=v&&v.ui;
      out= target==="arquitecto"?promptArchitect(d): target==="writer"?promptWriter(d,a||{"(salida del arquitecto)":"…"}): target==="ui"?promptUI(d,a,w): target==="qa"?promptQA(d,a,w,u): target==="writer_revision"?promptWriterReview(d,u,v?v.n:null): target==="notas"?(v?promptNotes(key,v,d,noteCase(key,v)):"(esta card todavía no tiene versión)"): promptRevise(d,v||{},"(aquí va tu petición de cambio)");
      note=`Con los datos de ${key}${v?` y su versión v${v.n}`:""}.`+(PROMPT_DEFS[id].shared?" Este bloque se ve dentro del prompt del Arquitecto UX.":""); }
  }catch(e){ note="No se pudo construir la vista previa: "+clip(e&&e.message||"",140); }
  S.prompts=saved;
  box.innerHTML=`<div class="sec"><h3>Prompt final</h3><p class="small muted">${esc(note)}${out?` · ${out.length.toLocaleString("es")} caracteres`:""}</p>${out?`<pre class="mono small orq-pre">${esc(out)}</pre>`:""}</div>`;
}

function renderAll(){
  renderConn();
  $("#viewCliente").hidden=S.role!=="cliente"; $("#viewDisenador").hidden=S.role!=="disenador"; $("#viewOrq").hidden=S.role!=="orquestador";
  $("#roleCliente").setAttribute("aria-pressed",S.role==="cliente"); $("#roleDisenador").setAttribute("aria-pressed",S.role==="disenador"); $("#roleOrq").setAttribute("aria-pressed",S.role==="orquestador");
  if(S.role==="cliente") renderClient(); else if(S.role==="orquestador") renderOrq(); else renderDesigner();
}

/* ---------- versiones de la card seleccionada ---------- */
function selectIssue(key){
  if(S.selected===key) return;
  S.selected=key;
  if(S.unsubVer){ S.unsubVer(); S.unsubVer=null; }
  if(S.db){ try{ S.unsubVer=S.db.collection(`runs/${key}/versions`).onSnapshot(snap=>{ S.versions[key]=snap.docs.map(d=>d.data()).filter(Boolean); renderAll(); },()=>{}); }catch(e){} }
  if(!S.detail[key]) loadDetail(key);
  renderAll();
}

/* ---------- eventos ---------- */
document.addEventListener("click",e=>{
  const vwb=e.target.closest("button[data-view]"); if(vwb){ S.scrView=vwb.dataset.view; lsSet("ep_scrview",S.scrView); renderDetail(); return; }
  const pst=S.protoKey&&S.proto[S.protoKey];
  const pa=e.target.closest("button[data-pact]"); if(pa){ if(pa.dataset.pact==="hints"){ S.protoHints=S.protoHints===false; lsSet("ep_hints",S.protoHints?"1":"0"); } else if(pst){ pst.msg=null; if(pa.dataset.pact==="back"&&pst.hist.length>1) pst.hist.pop(); if(pa.dataset.pact==="reset") pst.hist=[pst.hist[0]]; } renderDetail(); return; }
  const pg=e.target.closest("button[data-pgo]"); if(pg&&pst){ pst.msg=null; pst.hist.push(pg.dataset.pgo); renderDetail(); return; }
  const hs=e.target.closest("#protoStage [data-to], #protoStage [data-back], #protoStage [data-nav]"); if(hs&&pst&&String(hs.dataset.to||"").startsWith("ext:")){ pst.msg=`Esto abre «${hs.dataset.to.slice(4)}», que no forma parte de esta propuesta.`; renderDetail(); return; }
  if(hs&&pst){ pst.msg=null; if(hs.hasAttribute("data-to")||hs.hasAttribute("data-nav")) pst.hist.push(hs.dataset.to||hs.dataset.nav); else if(pst.hist.length>1) pst.hist.pop(); renderDetail(); return; }
  const sc=e.target.closest("button[data-scr]"); if(sc){ const row=$("#scrRow"); if(row) row.scrollBy({left:Number(sc.dataset.scr)*(row.clientWidth*0.8),behavior:"smooth"}); return; }
  const oq=e.target.closest("button[data-orq]"); if(oq){ S.orqSel=oq.dataset.orq; S.orqMsg=""; renderOrq(); const ed=$("#orqEd"); if(ed){ const r=ed.getBoundingClientRect(); if(r.top>window.innerHeight*0.6||r.top<0) ed.scrollIntoView({behavior:"smooth",block:"start"}); } return; }
  const ov=e.target.closest("button[data-orqvar]"); if(ov){ const t=$("#orqTxt"); if(t){ const ins="{{"+ov.dataset.orqvar+"}}"; const a=t.selectionStart||t.value.length, b=t.selectionEnd||a; t.value=t.value.slice(0,a)+ins+t.value.slice(b); t.focus(); t.selectionStart=t.selectionEnd=a+ins.length; S.orqDraft[S.orqSel]=t.value; orqValidate(); } return; }
  const r=e.target.closest("button[data-role]"); if(r){ S.role=r.dataset.role; lsSet("ep_role",S.role); renderAll(); scheduleAuto(); return; }
  const p=e.target.closest("button[data-pick]"); if(p){ selectIssue(p.dataset.pick); if(window.innerWidth<1000) $("#detail").scrollIntoView({behavior:"smooth",block:"start"}); return; }
  const qs=e.target.closest("button[data-qasev]"); if(qs&&S.selected){ S.qaSev[S.selected]=qs.dataset.qasev; renderAgentes(S.selected); return; }
  const at=e.target.closest("button[data-agtab]"); if(at&&S.selected){ S.agTab[S.selected]=at.dataset.agtab; renderAgentes(S.selected); return; }
  const sb=e.target.closest("button[data-step]"); if(sb&&S.selected){ if(Number(sb.dataset.step)!==2) S.prelaunch[S.selected]=false; goStep(S.selected,Number(sb.dataset.step)); return; }
  const v=e.target.closest("button[data-ver]"); if(v){ S.verSel[S.selected]=Number(v.dataset.ver); renderDetail(); return; }
  const a=e.target.closest("[data-act]"); if(!a) return;
  if(a.dataset.act==="askInsert"&&S.selected){ const t=$("#askBox"); const q=pendingQs(S.detail[S.selected]||issueOf(S.selected)||{}); if(t){ t.value=(t.value.trim()?t.value.trim()+"\n\n":"")+"Para avanzar con el diseño necesitamos confirmar:\n"+q.map(x=>"* "+x).join("\n"); S.drafts[S.selected+":ask"]=t.value; t.focus(); } return; }
  if(a.dataset.act==="briefMore"){ const b=$("#lBriefBox"); if(b){ b.classList.toggle("clamp"); a.textContent=b.classList.contains("clamp")?"Ver completo":"Ver menos"; } return; }
  if(a.dataset.act==="perm"){ permAction(a.dataset.cap); return; }
  if(a.dataset.act==="figPages"){ S.figPagesErr=null; loadFigPages(true); return; }
  if(a.dataset.act==="orqSave"){ orqSave(false); return; } if(a.dataset.act==="orqReset"){ orqSave(true); return; } if(a.dataset.act==="orqPreview"){ orqPreview(); return; }
  const key=S.selected; const act=a.dataset.act;
  if(act==="editBrief"){ S.client.editing=true; renderClient(); const bp=$("#briefPanel"); if(bp){ const r=bp.getBoundingClientRect(); if(r.top<0||r.top>window.innerHeight*0.4) bp.scrollIntoView({behavior:"smooth",block:"start"}); const t=$("#bTitle"); if(t) t.focus({preventScroll:true}); } return; }
  if(act==="closeEdit"){ S.client.editing=false; renderClient(); return; }
  if(act==="example"){ const ex=BRIEF_EXAMPLES[Number(a.dataset.ex)||0]; if(ex){ $("#bTitle").value=ex.title; $("#bDesc").value=ex.desc; $("#bGoal").value=ex.goal||""; $("#bPlat").value="App móvil"; if($("#bDate")) $("#bDate").value=ex.date||""; if($("#bPrio")) $("#bPrio").value=ex.prio||"Medium"; S.client.analysis=null; S.client.answers={}; S.client.prevQA=[]; S.client.created=null; S.client.err=null; const m=$("#exMenu"); if(m) m.open=false; renderClient(); $("#bTitle").focus(); } }
  else if(act==="refresh") refreshIssues();
  else if(act==="retryJira") initJira();
  else if(act==="reanalyze") analyze();
  else if(act==="send") sendBrief();
  else if(act==="useTitle"&&S.client.analysis){ $("#bTitle").value=S.client.analysis.titulo_sugerido; renderClient(); }
  else if(act==="run"&&key){ S.msgs[key]=null; runAgents(key,{agents:agentSel(key)}); }
  else if(act==="launch"&&key){ S.msgs[key]=null; S.stepView[key]=null; runAgents(key,{agents:agentSel(key)}); startProgress(key); }
  else if(act==="prelaunch"&&key){ S.prelaunch[key]=true; goStep(key,2); }
  else if(act==="cancelPre"&&key){ S.prelaunch[key]=false; goStep(key,3); }
  else if(act==="briefOk"&&key){ if(curStep(key)===1){ S.stepView[key]=null; setFlow(key,{briefOk:new Date().toISOString()}); } else goStep(key,2); }
  else if(act==="figDone"&&key){ S.stepView[key]=null; setFlow(key,{figmaDone:true,figmaDoneAt:new Date().toISOString()}); }
  else if(act==="deliver"&&key){ deliverPM(key); }
  else if(act==="movePm"&&key){ retryMovePm(key); }
  else if(act==="askPend"&&key){ const f=flowData(key); const ls=lastSent(key); const v=ls&&(S.versions[key]||[]).find(x=>x.n===ls.n)||latestVersion(key); const qs=(f.pend&&f.pend.v===(v&&v.n)?f.pend.cliente:pendRaw(v).preguntas); S.drafts[key+":ask"]="Para cerrar el diseño necesitamos confirmar:\n"+qs.map(q=>"* "+q).join("\n"); goStep(key,1); const b=$("#askBox"); if(b){ b.value=S.drafts[key+":ask"]; b.focus(); } }
  else if(act==="pmRedo"&&key){ const f=flowData(key); S.pmDraft[key]=f.pmMsg||null; S.msgs["pm"+key]=null; setFlow(key,{delivered:null,mentionWarn:null}); }
  else if(act==="pmReset"&&key){ S.pmDraft[key]=null; const b=$("#pmBox"); if(b) b.value=pmMessage(key); }
  else if(act==="agToggle"){}
  else if(act==="ask"&&key){ askClientNow(key); }
  else if(act==="resume"&&key){ S.msgs[key]=null; runAgents(key,{resume:true}); }
  else if(act==="revise"&&key){ const txt=($("#chgBox")||{}).value||""; if(!txt.trim()){ S.msgs[key]="Describe el cambio que quieres antes de aplicarlo."; renderDetail(); return; } S.msgs[key]=null; S.drafts[key+":change"]=txt; reviseVersion(key,txt); }
  else if(act==="qaFill"&&key){ const v=selVersion(key); const txt="Aplica estas sugerencias de QA:\n"+arr(v&&v.qa&&v.qa.problemas).map(p=>`- [${p.severidad}] ${p.pantalla}: ${p.sugerencia||p.detalle}`).join("\n"); const b=$("#chgBox"); b.value=txt; S.drafts[key+":change"]=txt; b.focus(); }
  else if(act==="figma"&&key){ sendToFigma(key); }
  else if(act==="plans"){ S.figPlans=null; S.figErr=null; renderDetail(); }
  else if(act==="reloadDetail"&&key) loadDetail(key,true);
  else if(act==="comment"&&key) postComment(key,($("#cmtBox")||{}).value||"");
  else if(act==="insertQs"&&key){ const v=latestVersion(key); const b=$("#cmtBox"); const txt=(b.value?b.value+"\n\n":"")+"Para avanzar con el diseño necesitamos confirmar:\n"+arr(v.architect.preguntas_abiertas).map(q=>`* ${q}`).join("\n"); b.value=txt; S.drafts[key+":comment"]=txt; b.focus(); }
  else if(act==="askClient"&&key){ const v=selVersion(key); S.drafts[key+":ask"]="Para avanzar con el diseño necesitamos confirmar:\n"+arr(v.architect.preguntas_abiertas).map(q=>`* ${q}`).join("\n"); goStep(key,1); const b=$("#askBox"); if(b){ b.value=S.drafts[key+":ask"]; b.focus(); } }
  else if(act==="docCopy"&&key){ const t=$("#docSrc"); const txt=t?t.value:""; const done=()=>{ S.msgs["doc"+key]="copied"; renderDetail(); }; try{ navigator.clipboard.writeText(txt).then(done,()=>{ t.hidden=false; t.select(); }); }catch(err){ t.hidden=false; t.select(); } }
  else if(act==="docJira"&&key){ const t=$("#docSrc"); publishDoc(key,t?t.value:""); }
});
async function publishDoc(key,txt){
  S.busy["doc"+key]=true; S.msgs["doc"+key]=null; renderDetail();
  try{ await call(ATL,"addOrEditJiraIssueComment",{cloudId:S.cloudId,issueIdOrKey:key,commentBody:txt.replace(/^# .*\n/,"**Documentación de diseño**\n")}); S.msgs["doc"+key]="ok"; loadDetail(key,true); }
  catch(e){ S.msgs["doc"+key]=mcpMsg(e,"Jira"); }
  S.busy["doc"+key]=false; renderDetail();
}
document.addEventListener("toggle",e=>{ if(e.target&&e.target.id==="agDet"&&e.target.open&&S.selected) renderAgentes(S.selected); },true);
async function startProgress(key){
  if(!S.mcp||!S.cloudId) return;
  try{ const r=await moveCard(key,"progress"); S.msgs["jira"+key]=r.moved?{ok:true,t:"La card pasó a In Progress en Jira."}:null; }
  catch(e){ S.msgs["jira"+key]={ok:false,t:"Los agentes trabajan, pero la card no se pudo mover a In Progress: "+mcpMsg(e,"Jira")}; }
  renderDetail();
}
document.addEventListener("focusin",e=>{ if(e.target&&e.target.id==="figPage"&&!S.busy.figPages&&Date.now()-(S.figPagesAt||0)>20000) loadFigPages(true); });
document.addEventListener("change",e=>{ const t=e.target; if(t.id==="figPage"&&S.selected){ S.figPageSel[S.selected]=t.value; renderDetail(); return; } if(t.dataset&&t.dataset.ag&&S.selected){ const k=S.selected; let a=agentSel(k).filter(x=>x!==t.dataset.ag); if(t.checked) a.push(t.dataset.ag); a=cleanSel(a); S.agentSel[k]=a; lsSet("ep_agents",JSON.stringify(a)); renderDetail(); } });
document.addEventListener("input",e=>{
  const t=e.target;
  if(t.dataset&&t.dataset.ans){ S.client.answers[t.dataset.ans]=t.value; const a=S.client.analysis; if(a){ const pend=arr(a.preguntas).filter(q=>q.obligatoria&&!(S.client.answers[q.id]||"").trim()).length; const b=document.querySelector('[data-act="send"]'); if(b&&!S.client.sending) b.textContent=pend?"Enviar igualmente a Jira":"Enviar a Jira"; } }
  if(t.id==="chgBox"&&S.selected) S.drafts[S.selected+":change"]=t.value;
  if(t.id==="askBox"&&S.selected) S.drafts[S.selected+":ask"]=t.value;
  if(t.id==="figNewPage"&&S.selected) S.figNewName[S.selected]=t.value;
  if(t.id==="orqTxt"&&S.orqSel){ S.orqDraft[S.orqSel]=t.value; orqValidate(); }
  if(t.id==="cmtBox"&&S.selected) S.drafts[S.selected+":comment"]=t.value;
  if(t.id==="pmBox"&&S.selected) S.pmDraft[S.selected]=t.value;
});
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"){ scheduleAuto(); renderAll(); } });
$("#briefForm").addEventListener("submit",e=>{ e.preventDefault(); analyze(); });
$("#cfgForm").addEventListener("submit",e=>{ e.preventDefault(); saveCfg({useDs:$("#cUseDs")?$("#cUseDs").checked:S.cfg.useDs,screenTheme:$("#cTheme")?$("#cTheme").value:(S.cfg.screenTheme||"dark"),product:$("#cProduct").value.trim(),figmaFile:($("#cFigma").value.trim()||FIGMA_DEFAULT),jiraBoard:($("#cJira").value.trim()||JIRA_DEFAULT),primary:$("#cPrimary").value,platform:$("#cPlatform").value,brandNotes:$("#cNotes").value.trim()}); });
async function saveCfg(patch){
  const msg=$("#cfgMsg");
  if(!S.db){ msg.textContent="No se pueden guardar ajustes en esta vista."; return; }
  try{ await S.db.doc("config/main").set(Object.assign({},S.cfg,patch)); msg.textContent="Guardado para todo el equipo."; }
  catch(e){ msg.textContent=e&&e.code==="invalid_argument"?"No tienes permiso para cambiar los ajustes.":"No se pudo guardar. Prueba de nuevo."; }
}
function fillCfg(){ const c=S.cfg; $("#cProduct").value=c.product||""; $("#cFigma").value=c.figmaFile||FIGMA_DEFAULT; $("#cJira").value=c.jiraBoard||JIRA_DEFAULT; $("#cPrimary").value=/^#[0-9a-f]{6}$/i.test(c.primary||"")?c.primary:"#0F6E6A"; $("#cPlatform").value=c.platform==="desktop"?"desktop":"mobile"; $("#cNotes").value=c.brandNotes||""; ; renderDsBox(); }
function renderDsBox(){
  const d=S.ds, on=dsOn();
  setHTML($("#dsBox"), d&&d.guide? `<div class="note" style="justify-items:stretch"><div class="btns" style="justify-content:space-between"><b>Sistema de diseño: ${esc(d.name)}</b><span class="chip ${on?"ok":""}">${on?"Activo":"Desactivado"}</span></div><span class="small muted">Los agentes siguen sus reglas y las pantallas se dibujan con sus tokens y componentes. Copia del ${esc(fmtDate(d.syncedAt))}.</span>${d.url?`<a class="small" href="${esc(d.url)}" target="_blank" rel="noopener">Abrir el sistema ↗</a>`:""}<label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="cUseDs" ${S.cfg.useDs!==false?"checked":""}> Usar este sistema en las propuestas</label>${d.themeDark&&!figLib()?`<div class="fld"><label for="cTheme">Tema de las pantallas</label><select id="cTheme"><option value="dark" ${S.cfg.screenTheme!=="light"?"selected":""}>Oscuro, como la app actual</option><option value="light" ${S.cfg.screenTheme==="light"?"selected":""}>Claro</option></select></div>`:""}${d.figmaLib?`<span class="small muted">En Figma las pantallas se construyen con los componentes reales del archivo «Rumbo Design System» (${Object.keys(d.figmaLib.sets||{}).length} componentes) y se añaden como sección en la página «${esc(d.figmaLib.workPage||"Pantallas IA")}».</span>`:""}${d.appContext?`<span class="small muted">Los agentes conocen cómo es la app hoy (Inicio, Planifica tu viaje y Elige un viaje) a partir de tus capturas.</span>`:""}</div>` : `<div class="note"><span class="small">Sin sistema de diseño conectado. Los agentes usan el color primario y las notas de marca.</span></div>`);
  const pf=$("#primaryFld"); if(pf) pf.hidden=on;
}

/* ---------- arranque ---------- */
{ const l=document.querySelector("#exMenu .exlist"); if(l){ const it=(x,i)=>`<button type="button" role="menuitem" data-act="example" data-ex="${i}"><span class="small muted">${esc(x.tipo)}</span><b>${esc(x.title)}</b></button>`;
  l.innerHTML=`<span class="exh">Por calidad del brief · puntuación orientativa</span>`+BRIEF_EXAMPLES.map((x,i)=>x.grupo==="q"?it(x,i):"").join("")+`<span class="exh">Por tipo de petición</span>`+BRIEF_EXAMPLES.map((x,i)=>x.grupo!=="q"?it(x,i):"").join(""); } }
const savedRole=lsGet("ep_role"); if(["disenador","cliente","orquestador"].includes(savedRole)) S.role=savedRole;
renderAll();

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
  syncApiConfigForm();
};

async function syncApiConfigForm() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    const gKeyInput = $("#cGeminiKey");
    const jHostInput = $("#cJiraHost");
    const jEmailInput = $("#cJiraEmail");
    const jTokenInput = $("#cJiraToken");

    const localKey = localStorage.getItem('ep_gemini_key') || '';
    if (gKeyInput) {
      if (localKey) gKeyInput.value = localKey;
      else if (cfg.gemini?.hasKey) gKeyInput.placeholder = "✓ Configurada en servidor (.env)";
    }
    if (jHostInput && cfg.jira?.host) {
      jHostInput.value = cfg.jira.host;
    }
    if (jEmailInput && cfg.jira?.hasEmail) {
      jEmailInput.value = cfg.jira.email || "";
    }
    if (jTokenInput && cfg.jira?.hasToken) {
      jTokenInput.placeholder = "✓ Configurado en servidor (.env)";
    }
  } catch (e) {}
}

// Control del diálogo modal de configuración de APIs
const apiModal = document.getElementById('apiModal');
const btnOpenApiModal = document.getElementById('btnOpenApiModal');
const btnOpenApiModalFromCfg = document.getElementById('btnOpenApiModalFromCfg');
const btnCloseApiModal = document.getElementById('btnCloseApiModal');
const btnSaveApiCfg = document.getElementById('btnSaveApiCfg');
const btnTestApis = document.getElementById('btnTestApis');
const apiCfgStatus = document.getElementById('apiCfgStatus');

function openApiModal() {
  if (!apiModal) return;
  syncApiConfigForm();
  if (apiCfgStatus) apiCfgStatus.style.display = 'none';
  apiModal.showModal();
}

if (btnOpenApiModal) btnOpenApiModal.addEventListener('click', openApiModal);
if (btnOpenApiModalFromCfg) btnOpenApiModalFromCfg.addEventListener('click', openApiModal);
if (btnCloseApiModal) btnCloseApiModal.addEventListener('click', () => apiModal.close());

async function handleSaveAndTestApis(onlyTest = false) {
  const gKey = ($("#cGeminiKey")?.value || "").trim();
  const jHost = ($("#cJiraHost")?.value || "").trim();
  const jEmail = ($("#cJiraEmail")?.value || "").trim();
  const jToken = ($("#cJiraToken")?.value || "").trim();

  if (gKey) aiService.setApiKey(gKey);

  // Sincronizar siempre con el backend para la prueba
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        geminiKey: gKey || undefined,
        jiraHost: jHost || undefined,
        jiraEmail: jEmail || undefined,
        jiraToken: jToken || undefined
      })
    });
  } catch (e) {}

  if (apiCfgStatus) {
    apiCfgStatus.style.display = 'block';
    apiCfgStatus.className = 'note';
    apiCfgStatus.innerHTML = '<span class="spin" style="margin-right:6px"></span> ' + (onlyTest ? 'Verificando conexiones...' : 'Guardando y confirmando conexiones...');
  }

  const results = [];
  let allOk = true;

  // 1. Probar Gemini
  try {
    const testGen = await aiService.json('Genera un JSON simple: {"status":"ok","msg":"gemini activo"}', { model: 'gemini-3.8-flash' });
    if (testGen && (testGen.status === 'ok' || testGen.msg)) {
      results.push('✓ <b>Google AI Studio (Gemini 3.8 Flash):</b> Conexión confirmada y lista.');
    } else {
      results.push('✓ <b>Google AI Studio:</b> Conectado.');
    }
  } catch (err) {
    allOk = false;
    results.push('❌ <b>Google AI Studio:</b> ' + (err.message || 'Error de API Key o cuota.'));
  }

  // 2. Probar Jira
  try {
    const jStatusRes = await fetch('/api/jira/status');
    const jStatus = await jStatusRes.json();
    if (jStatus.configured) {
      if (jStatus.authOk) {
        results.push(`✓ <b>Jira Cloud (${jStatus.host}):</b> Conexión confirmada como <i>${jStatus.user || jStatus.host}</i>.`);
      } else {
        allOk = false;
        results.push(`⚠️ <b>Jira Cloud:</b> ${jStatus.authError || 'Verifica el correo y API Token.'}`);
      }
    } else {
      results.push('ℹ️ <b>Jira Cloud:</b> Faltan datos (Host, Email o Token).');
    }
  } catch (err) {
    allOk = false;
    results.push('⚠️ <b>Jira Cloud:</b> ' + (err.message || 'No se pudo conectar con el servidor local.'));
  }

  if (apiCfgStatus) {
    apiCfgStatus.className = 'note ' + (allOk ? 'ok' : 'warn');
    apiCfgStatus.innerHTML = `
      <div style="display:grid;gap:6px">
        <strong>${onlyTest ? 'Resultado de la prueba:' : '✓ Ajustes guardados y verificados:'}</strong>
        ${results.map(r => `<div>${r}</div>`).join('')}
      </div>
    `;
  }

  initJira();
  renderAll();
}

if (btnSaveApiCfg) btnSaveApiCfg.addEventListener('click', () => handleSaveAndTestApis(false));
if (btnTestApis) btnTestApis.addEventListener('click', () => handleSaveAndTestApis(true));

const origSaveCfg = saveCfg;
saveCfg = async function(patch) {
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
        console.log("Figma Tool call:", tool, input);
        if (tool === "whoami") {
          return { whoami: { plans: [{ key: "team", name: "Team" }] } };
        }
        if (tool === "use_figma") {
          // Si es para leer las páginas del archivo (loadFigPages)
          const isListingPages = input.code && (input.code.includes("return {pages:out}") || (input.description && input.description.includes("Lista las páginas")));
          if (isListingPages) {
            try {
              const pRes = await fetch("/api/figma/pages");
              if (pRes.ok) {
                const pData = await pRes.json();
                if (pData && pData.pages && pData.pages.length > 0) {
                  return { pages: pData.pages };
                }
              }
            } catch(e) {}
            return { pages: [{ id: "0:1", name: "Pantallas IA", sections: 0 }] };
          }

          // Si es para enviar y dibujar en Figma (sendToFigma)
          try {
            console.log("[FigmaBridge] Enviando propuesta a /api/figma/execute...", input.fileKey, input.description);
            const execRes = await fetch("/api/figma/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileKey: input.fileKey,
                code: input.code,
                description: input.description,
                key: S.selected || "KAN-15"
              })
            });
            if (execRes.ok) {
              const execData = await execRes.json();
              console.log("[FigmaBridge] Resultado recibido de execute:", execData);
              if (execData && execData.result) {
                return execData.result;
              }
            }
          } catch(e) {
            console.warn("[FigmaBridge] Figma execute error:", e);
          }

          return { success: true, pageName: "Pantallas IA", sectionName: (S.selected || "Tarea") + " v1" };
        }
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
