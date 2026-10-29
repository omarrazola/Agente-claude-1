const SPEC = __SPEC__;
const META = __META__;
const DS = SPEC.dsLib || {};
const SETS = DS.sets || {}, VARS = DS.vars || {}, TSTY = DS.text || {}, ICONS = DS.icons || {};
const JK = "Plus Jakarta Sans";
for (const s of ["Regular", "Medium", "SemiBold", "Bold"]) { try { await figma.loadFontAsync({ family: JK, style: s }); } catch (e) {} }
for (const s of ["Bold", "Medium"]) { try { await figma.loadFontAsync({ family: "JetBrains Mono", style: s }); } catch (e) {} }
for (const s of ["Regular", "Medium", "Semi Bold", "Bold"]) await figma.loadFontAsync({ family: "Inter", style: s });
const W = SPEC.platform === "desktop" ? 1440 : 375;
const H = SPEC.platform === "desktop" ? 1024 : 812;
const MOBILE = W === 375;
function hex(h) { h = String(h || "#000000").replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); const n = parseInt(h.slice(0, 6), 16) || 0; return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; }
const FALL = { "bg/primary": "#000000", "bg/tertiary": "#1F1F1F", "text/primary": "#FFFFFF", "text/secondary": "#AFAFAF", "border/default": "#2C2C2C", "brand/primary": "#FFC800", "icon/primary": "#FFFFFF" };
const _v = {};
async function pv(name) {
  const id = VARS[name];
  if (id) { try { const v = _v[id] || (_v[id] = await figma.variables.getVariableByIdAsync(id)); if (v) return [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", v)]; } catch (e) {} }
  return [{ type: "SOLID", color: hex(FALL[name] || "#FFFFFF") }];
}
function al(dir, props) { const f = figma.createAutoLayout(dir); f.fills = []; if (props) f.set(props); return f; }
async function txt(s, style, color) {
  const t = figma.createText();
  let ok = false;
  if (TSTY[style]) { try { await t.setTextStyleIdAsync(TSTY[style]); ok = true; } catch (e) {} }
  if (!ok) { t.fontName = { family: "Inter", style: /Heading|Display/.test(style) ? "Bold" : /Label/.test(style) ? "Semi Bold" : "Regular" }; t.fontSize = /Large/.test(style) ? 20 : 15; }
  t.characters = String(s == null ? "" : s);
  t.fills = await pv(color || "text/primary");
  return t;
}
function fillW(parent, node) { parent.appendChild(node); try { node.layoutSizingHorizontal = "FILL"; } catch (e) {} if (node.type === "TEXT") node.textAutoResize = "HEIGHT"; return node; }
/* ===== Componentes del sistema ===== */
const _sets = {};
const usedDs = new Set();
const dsErrors = [];
async function setOf(name) {
  if (name in _sets) return _sets[name];
  let s = null; try { s = SETS[name] ? await figma.getNodeByIdAsync(SETS[name]) : null; } catch (e) { s = null; }
  return (_sets[name] = s);
}
async function inst(name, variant, props) {
  const set = await setOf(name);
  if (!set) throw new Error("falta el componente " + name);
  let target = set.type === "COMPONENT_SET" ? set.defaultVariant : set;
  if (set.type === "COMPONENT_SET" && variant) {
    let best = null, bs = -1;
    for (const c of set.children) { const vp = c.variantProperties || {}; let s = 0; for (const [k, v] of Object.entries(variant)) if (vp[k] === v) s++; if (s > bs) { bs = s; best = c; } }
    target = best || target;
  }
  const i = target.createInstance();
  if (props) setP(i, props);
  usedDs.add(name);
  return i;
}
function setP(i, props) {
  const defs = i.componentProperties || {};
  const out = {};
  for (const [n, v] of Object.entries(props)) {
    if (v === undefined || v === null) continue;
    const k = Object.keys(defs).find(x => x.split("#")[0] === n);
    if (!k) continue;
    out[k] = defs[k].type === "TEXT" ? String(v) : v;
  }
  try { i.setProperties(out); } catch (e) { for (const [k, v] of Object.entries(out)) { try { i.setProperties({ [k]: v }); } catch (e2) {} } }
}
function child(i, name) { return i.findOne(n => n.name === name); }
async function swapIcon(i, nodeName, icon) {
  if (!icon || !ICONS[icon]) return;
  try { const c = await figma.getNodeByIdAsync(ICONS[icon]); const n = i.findOne(x => x.type === "INSTANCE" && x.name === nodeName && x.parent && x.parent.name === "Leading") || i.findOne(x => x.type === "INSTANCE" && x.name === nodeName); if (c && n) n.swapComponent(c); } catch (e) {}
}
const ICONWORDS = [[/compart/i, "share"], [/hora|program|reserv|tiempo/i, "clock"], [/aeropuerto|vuelo|terminal/i, "location"], [/casa|hogar|home/i, "home"], [/trabajo|oficina/i, "grid"], [/pago|tarjeta|visa|cobro|efectivo/i, "card"], [/segur|emergencia|protecc/i, "shield"], [/llam|tel[eé]fono/i, "phone"], [/mensaje|chat/i, "message"], [/conductor|perfil|cuenta|usuario/i, "user"], [/coche|veh[ií]culo|viaje|taxi|confort|xl|eco/i, "car"], [/valor|estrella|calific/i, "star"], [/ayuda|info/i, "info"]];
function iconFor(s, def) { s = String(s || ""); for (const [re, ic] of ICONWORDS) if (re.test(s)) return ic; return def || "location"; }
const TONE = { info: "Info", accent: "Info", success: "Positive", positive: "Positive", warning: "Warning", error: "Negative", negative: "Negative" };
const TAG = { gray: "Neutral", solid: "Brand", accent: "Info", info: "Info", positive: "Positive", success: "Positive", warning: "Warning", negative: "Negative", error: "Negative" };
const BLEED = new Set(["list", "option", "check", "sectionheading", "tabs", "divider", "driver", "map", "sheetheader", "appbar"]);
async function pane(parent) { const p = al("VERTICAL", { name: "Bloque", itemSpacing: 12, paddingLeft: 16, paddingRight: 16 }); fillW(parent, p); return p; }
async function dsBlock(parent, b) {
  const k = b.t;
  if (k === "appbar") {
    const ty = b.left === "back" ? "Back" : b.left === "close" ? "Close" : b.left === "menu" ? "Back" : "Large title";
    const i = await inst("Navigation header", { Type: ty }, { Title: b.title || "", "Show trailing": false }); fillW(parent, i);
    if (ty === "Large title" && !b.left) { const row = child(i, "Row"); if (row) row.visible = false; }
    return true;
  }
  if (k === "sheetheader") { fillW(parent, await inst("Sheet header", null, { Title: b.title || "", Subtitle: b.subtitle || "", "Show subtitle": !!b.subtitle, "Show close": b.close !== false })); return true; }
  if (k === "button") {
    const h = { primary: "Primary", secondary: "Secondary", ghost: "Tertiary", danger: "Destructive" }[b.variant || "primary"] || "Primary";
    fillW(parent, await inst("Button", { Hierarchy: h, Size: "Large", State: b.disabled ? "Disabled" : "Default" }, { Label: b.label || "" })); return true;
  }
  if (k === "input") {
    const i = await inst("Text field", { State: b.error ? "Error" : "Default" }, { Label: b.label || "", Value: b.value || b.placeholder || "", Helper: b.error || b.helper || "", "Show helper": !!(b.error || b.helper) });
    fillW(parent, i); if (!b.value) { const v = child(i, "Value"); if (v) v.fills = await pv("text/tertiary"); } return true;
  }
  if (k === "search") { fillW(parent, await inst("Search field", { State: b.value ? "Filled" : "Empty" }, { Text: b.value || b.placeholder || "" })); return true; }
  if (k === "select") {
    const i = await inst("Select", { State: b.error ? "Error" : "Default" }, { Label: b.label || "", Value: b.value || b.placeholder || "", Helper: b.error || b.helper || "", "Show helper": !!(b.error || b.helper) });
    fillW(parent, i); if (!b.value) { const v = child(i, "Value"); if (v) v.fills = await pv("text/tertiary"); } return true;
  }
  if (k === "banner") { fillW(parent, await inst("Banner", { Type: TONE[b.tone] || "Info" }, { Title: b.title || "", "Show title": !!b.title, Message: b.text || "", Action: b.action || "", "Show action": !!b.action })); return true; }
  if (k === "list") {
    for (const it of (b.items || [])) {
      const nav = !it.trailing || it.trailing === "›" || it.chevron;
      const i = await inst("List item", { Type: nav ? "Navigation" : "Info", Selected: "False" }, { Title: it.title || "", Description: it.subtitle || "", "Show description": !!it.subtitle, Trailing: nav ? (it.lead || "") : it.trailing, "Show trailing": nav ? !!it.lead : true, "Show leading": it.icon !== false });
      await swapIcon(i, "Icon", iconFor((it.icon || "") + " " + it.title + " " + (it.subtitle || "")));
      fillW(parent, i);
    }
    return true;
  }
  if (k === "option") {
    const desc = [b.subtitle, b.badge && b.badge.text].filter(Boolean).join(" · ");
    const i = await inst("List item", { Type: "Option", Selected: b.selected ? "True" : "False" }, { Title: (b.title || "") + (b.capacity ? " · " + b.capacity : ""), Description: desc, "Show description": !!desc, Trailing: b.price || "", "Show trailing": !!b.price });
    await swapIcon(i, "Icon", iconFor(b.icon || b.title, "car")); fillW(parent, i); return true;
  }
  if (k === "check") {
    if (b.kind === "toggle") {
      const r = al("HORIZONTAL", { name: "Switch row", itemSpacing: 16, paddingLeft: 16, paddingRight: 16, paddingTop: 12, paddingBottom: 12, counterAxisAlignItems: "CENTER" }); fillW(parent, r);
      fillW(r, await txt(b.label || "", "Label/Large", "text/primary")); r.appendChild(await inst("Switch", { Checked: b.checked ? "On" : "Off" })); return true;
    }
    const ty = b.kind === "radio" ? "Option" : "Check";
    const i = await inst("List item", { Type: ty, Selected: b.checked ? "True" : "False" }, { Title: b.label || "", "Show description": !!b.detail, Description: b.detail || "", "Show trailing": false, "Show leading": false });
    fillW(parent, i); return true;
  }
  if (k === "chips" || k === "tags") {
    const r = al("HORIZONTAL", { name: "Tags", itemSpacing: 8, counterAxisSpacing: 8, layoutWrap: "WRAP" }); fillW(parent, r);
    for (const s of (b.items || [])) { const it = typeof s === "object" && s ? s : { text: s }; r.appendChild(await inst("Tag", { Color: k === "chips" ? "Neutral" : (TAG[it.tone || "gray"] || "Neutral") }, { Label: it.text || "" })); }
    return true;
  }
  if (k === "tabs") {
    const items = (b.items || []).slice(0, 3); if (items.length < 2) return false;
    const i = await inst("Tabs", { Active: String(Math.min(items.length, (b.active || 0) + 1)) }, { "Tab 1": items[0], "Tab 2": items[1], "Tab 3": items[2] || "" });
    fillW(parent, i); if (items.length < 3) { const t3 = child(i, "Tab 3"); if (t3) t3.visible = false; } return true;
  }
  if (k === "segmented") {
    const items = (b.items || []).slice(0, 3); if (items.length < 2) return false;
    fillW(parent, await inst("Segmented control", { Options: String(items.length) }, { "Option 1": items[0], "Option 2": items[1], "Option 3": items[2] || "" })); return true;
  }
  if (k === "sectionheading") { fillW(parent, await inst("Section heading", { Size: "Small" }, { Title: b.text || "", Action: b.action || "", "Show action": !!b.action })); return true; }
  if (k === "progress") {
    if (b.label) fillW(parent, await txt(b.label, "Label/Medium", "text/primary"));
    const i = await inst("Progress bar", { Type: b.value == null ? "Indeterminate" : "Determinate" }); fillW(parent, i);
    const f = child(i, "Fill"); if (f && b.value != null) { try { f.resize(Math.max(4, (W - 32) * Math.max(0, Math.min(100, Number(b.value) || 0)) / 100), f.height); } catch (e) {} }
    return true;
  }
  if (k === "divider") { fillW(parent, await inst("Divider", { Weight: b.thick ? "Thick" : "Thin" })); return true; }
  if (k === "avatar") {
    const r = al("HORIZONTAL", { name: "Avatar", itemSpacing: 12, counterAxisAlignItems: "CENTER" }); fillW(parent, r);
    r.appendChild(await inst("Avatar", { Size: "Medium" }, { Initials: String(b.initials || (b.name || "·").split(" ").map(x => x[0]).join("")).slice(0, 2).toUpperCase() }));
    const col = al("VERTICAL", { itemSpacing: 2 }); fillW(r, col); fillW(col, await txt(b.name || "", "Label/Large")); if (b.detail) fillW(col, await txt(b.detail, "Body/Medium", "text/secondary"));
    return true;
  }
  if (k === "driver") { fillW(parent, await inst("Driver card", null, { Name: b.name || "Carlos M.", Rating: b.rating || "4,95", Car: b.car || "Toyota Corolla · Gris", Plate: b.plate || "4821 LKY" })); return true; }
  if (k === "map" || (k === "image" && /mapa|map|ruta/i.test(b.label || ""))) {
    const ty = { explore: "Explore", route: "Route", approaching: "Approaching" }[b.kind || b.mode] || (/ruta|route|destino/i.test(b.label || "") ? "Route" : /conductor|llega|camino/i.test(b.label || "") ? "Approaching" : "Explore");
    const i = await inst("Map", { Type: ty }, { "Show locate": true }); fillW(parent, i);
    if (b.eta) { const e = child(i, "ETA"); if (e && e.type === "INSTANCE") setP(e, { Label: b.eta }); }
    if (b.h) { try { i.resize(i.width, Math.max(200, Math.min(600, Number(b.h)))); } catch (e) {} }
    return true;
  }
  if (k === "empty") {
    const i = await inst("Empty state", null, { Title: b.title || "", Description: b.text || "", "Show action": !!b.cta }); fillW(parent, i);
    if (b.cta) { const a = child(i, "Action"); if (a && a.type === "INSTANCE") setP(a, { Label: b.cta }); }
    return true;
  }
  if (k === "snackbar") { fillW(parent, await inst("Snackbar", null, { Message: b.text || "", Action: b.action || "", "Show action": !!b.action })); return true; }
  if (k === "dialog") { const i = await inst("Dialog", null, { Title: b.title || "", Message: b.text || "" }); parent.appendChild(i); if (b.primary) { const p = child(i, "Primary"); if (p) setP(p, { Label: b.primary }); } if (b.secondary) { const s = child(i, "Secondary"); if (s) setP(s, { Label: b.secondary }); } return true; }
  return false;
}
/* ===== Composiciones con tokens (sin componente propio) ===== */
async function surface(name, props) { const f = al("VERTICAL", Object.assign({ name, itemSpacing: 6, paddingTop: 16, paddingBottom: 16, paddingLeft: 16, paddingRight: 16, cornerRadius: 16 }, props || {})); f.fills = await pv("bg/tertiary"); return f; }
const LINKS = [], BACKS = [];
function regLinks(b, nodes) {
  if (!nodes.length) return;
  const n0 = nodes[0];
  if (b.t === "list") { (b.items || []).forEach((it, i) => { if (it && it.to && nodes[i]) LINKS.push({ node: nodes[i], to: it.to, label: it.title }); }); return; }
  if (b.t === "appbar") { const l = child(n0, "Leading"); if (b.to && l) LINKS.push({ node: l, to: b.to, label: "Volver" }); else if (b.left === "back" && l) BACKS.push(l); return; }
  if (b.t === "empty") { const a = n0.type === "INSTANCE" ? child(n0, "Action") : null; if (b.to) LINKS.push({ node: a || n0, to: b.to, label: b.cta }); return; }
  if (b.t === "dialog") { const p = child(n0, "Primary"), s = child(n0, "Secondary"); if (b.to && p) LINKS.push({ node: p, to: b.to, label: b.primary }); if (b.secondaryTo && s) LINKS.push({ node: s, to: b.secondaryTo, label: b.secondary }); return; }
  if (b.to) LINKS.push({ node: n0, to: b.to, label: b.label || b.title || b.cta || b.placeholder || "" });
}
async function block(parent, b) {
  if (!b || typeof b !== "object") return;
  const target = BLEED.has(b.t) || (b.t === "image" && /mapa|map|ruta/i.test(b.label || "")) ? parent : await pane(parent);
  const before = target === parent ? parent.children.length : 0;
  const done = () => regLinks(b, target.children.slice(before));
  try { if (await dsBlock(target, b)) { done(); return; } } catch (e) { dsErrors.push(b.t + ": " + String(e && e.message || e).slice(0, 80)); }
  const k = b.t;
  if (k === "heading") { const lv = b.level || 1; fillW(target, await txt(b.text, lv === 1 ? "Heading/Large" : lv === 2 ? "Heading/Medium" : "Heading/Small")); }
  else if (k === "text") { fillW(target, await txt(b.text, b.size === "s" ? "Body/Medium" : "Body/Large", b.tone === "muted" ? "text/secondary" : "text/primary")); }
  else if (k === "card") { const c = await surface("Card"); fillW(target, c); if (b.meta) fillW(c, await txt(b.meta, "Caption", "text/secondary")); if (b.title) fillW(c, await txt(b.title, "Label/Large")); if (b.body) fillW(c, await txt(b.body, "Body/Medium", "text/secondary")); if (b.cta) { const t = await txt(b.cta, "Label/Medium", "text/primary"); t.textDecoration = "UNDERLINE"; fillW(c, t); } }
  else if (k === "stat") { const c = await surface("Stat", { itemSpacing: 2, paddingTop: 12, paddingBottom: 12, paddingLeft: 12, paddingRight: 12 }); fillW(target, c); fillW(c, await txt(b.label, "Caption", "text/secondary")); fillW(c, await txt(b.value, "Heading/Small")); if (b.delta) fillW(c, await txt(b.delta, "Caption", "status/positive")); }
  else if (k === "tile") { const c = await surface("Tile", { counterAxisAlignItems: "CENTER", itemSpacing: 8, paddingTop: 14, paddingBottom: 14, paddingLeft: 8, paddingRight: 8 }); fillW(target, c); const ic = ICONS[iconFor(b.icon + " " + b.label, "car")]; if (ic) { try { c.appendChild((await figma.getNodeByIdAsync(ic)).createInstance()); usedDs.add("Icon"); } catch (e) {} } const t = await txt(b.label, "Label/Medium"); t.textAlignHorizontal = "CENTER"; fillW(c, t); }
  else if (k === "row" || k === "grid") {
    const kids = b.children || []; const cols = k === "grid" ? Math.max(1, Math.min(4, b.cols || 2)) : kids.length || 1;
    const g = al("VERTICAL", { name: k === "grid" ? "Grid" : "Row", itemSpacing: 12 }); fillW(target, g);
    for (let i = 0; i < kids.length; i += cols) { const r = al("HORIZONTAL", { itemSpacing: 12 }); fillW(g, r); for (const ch of kids.slice(i, i + cols)) { const cell = al("VERTICAL", { itemSpacing: 8 }); fillW(r, cell); try { if (!(await dsBlock(cell, ch))) await block(cell, ch); } catch (e) { await block(cell, ch); } } for (let j = kids.slice(i, i + cols).length; j < cols; j++) fillW(r, al("VERTICAL")); }
  }
  else if (k === "image") { const f = al("VERTICAL", { name: "Imagen", cornerRadius: 16, primaryAxisAlignItems: "CENTER", counterAxisAlignItems: "CENTER" }); f.fills = await pv("bg/tertiary"); fillW(target, f); f.resize(f.width, Number(b.h) || 160); f.primaryAxisSizingMode = "FIXED"; f.appendChild(await txt(b.label || "Imagen", "Caption", "text/secondary")); }
  else if (k === "spacer") { const s = al("VERTICAL"); s.resize(10, Number(b.h) || 8); fillW(target, s); s.layoutSizingVertical = "FIXED"; }
  else if (b.text || b.label) fillW(target, await txt(b.text || b.label, "Body/Large"));
  if (target !== parent && target.children.length === 0) { target.remove(); return; }
  done();
}
async function screen(s) {
  const f = al("VERTICAL", { name: s.name || s.id || "Pantalla", itemSpacing: 0, clipsContent: true });
  f.fills = await pv("bg/primary"); f.resize(W, H); f.counterAxisSizingMode = "FIXED"; f.primaryAxisSizingMode = "AUTO"; f.minHeight = H;
  if (MOBILE) { try { fillW(f, await inst("Status bar")); } catch (e) {} }
  const blocks = (s.blocks || []).filter(b => b && typeof b === "object");
  const nav = blocks.filter(b => b.t === "bottomnav" || b.t === "dock");
  const rest = blocks.filter(b => b.t !== "bottomnav" && b.t !== "dock");
  const lead = [];
  while (rest.length && (rest[0].t === "appbar" || rest[0].t === "map")) lead.push(rest.shift());
  for (const b of lead) await block(f, b);
  const c = al("VERTICAL", { name: "Content", itemSpacing: 16, paddingTop: lead.length && lead[lead.length - 1].t === "map" ? 0 : 8, paddingBottom: 24 }); fillW(f, c);
  for (const b of rest) await block(c, b);
  for (const b of nav) {
    try {
      if (b.t === "dock") { const i = await inst("Button dock", { Layout: b.secondary ? "Double" : "Single" }, { Caption: b.caption || "", "Show caption": !!b.caption }); fillW(f, i); const p = child(i, "Primary"); if (p) { setP(p, { Label: b.label || "" }); if (b.to) LINKS.push({ node: p, to: b.to, label: b.label }); } const sc = child(i, "Secondary"); if (sc && b.secondary) { setP(sc, { Label: b.secondary }); if (b.secondaryTo) LINKS.push({ node: sc, to: b.secondaryTo, label: b.secondary }); } continue; }
      const labels = ["Inicio", "Servicios", "Actividad", "Cuenta"]; const items = b.items || []; const a = items[b.active || 0];
      const act = labels.find(l => String(a || "").toLowerCase().startsWith(l.toLowerCase().slice(0, 4))) || labels[Math.min(3, b.active || 0)];
      const bn = await inst("Bottom navigation", { Active: act }); fillW(f, bn);
      for (const [lab, to] of Object.entries(b.tabs || {})) { if (lab === act) continue; const it = child(bn, "Item " + lab); if (it) LINKS.push({ node: it, to, label: lab, tab: true }); }
    } catch (e) { dsErrors.push(b.t + ": " + String(e && e.message || e).slice(0, 80)); }
  }
  const used = f.children.reduce((m, n) => m + n.height, 0);
  if (used < H) { try { c.layoutSizingVertical = "FILL"; } catch (e) {} }
  return f;
}
/* ===== Página / sección de trabajo ===== */
/* Página elegida en el portal (por id); si no existe, por nombre; si se pide una nueva, se crea */
let page = null, fallback = false;
if (META.pageId) { try { const n = await figma.getNodeByIdAsync(META.pageId); if (n && n.type === "PAGE") page = n; } catch (e) {} }
if (!page && META.targetPage) page = figma.root.children.find(p => p.name === META.targetPage) || null;
if (!page && !META.newPage && META.workPage) page = figma.root.children.find(p => p.name === META.workPage) || null;
if (!page) {
  try { page = figma.createPage(); page.name = META.targetPage || META.pageName; }
  catch (e) { page = figma.root.children[figma.root.children.length - 1]; fallback = true; if (!page) throw new Error("PAGE_LIMIT: " + String(e && e.message || e).slice(0, 160)); }
}
await figma.setCurrentPageAsync(page);
/* Si ya hay secciones, la nueva va debajo de la que está más abajo, alineada con ella */
const SECS = page.children.filter(n => n.type === "SECTION");
let placeX = 0, placeY = 0;
if (SECS.length) { const last = SECS.reduce((m, n) => (n.y + n.height > m.y + m.height ? n : m)); placeX = last.x; placeY = last.y + last.height + 200; }
else if (page.children.length) { placeY = page.children.reduce((m, n) => Math.max(m, n.y + n.height), -Infinity) + 300; placeX = Math.min(...page.children.map(n => n.x)); }
/* Design asset «Tarea»: las tareas que ya hay en esta página pasan a «Old»; la nueva sección entra «In progress» */
let tareaSet = null, tareaOld = 0, tareaNew = false;
try { if (META.tareaSetId) { const n = await figma.getNodeByIdAsync(META.tareaSetId); if (n && n.type === "COMPONENT_SET") tareaSet = n; } } catch (e) {}
if (!tareaSet) for (const pg of figma.root.children) { try { await pg.loadAsync(); } catch (e) {} const f = pg.findOne(n => n.type === "COMPONENT_SET" && n.name === "Tarea"); if (f) { tareaSet = f; break; } }
/* Color de la sección según el estado de su tarea: fondo al 10 % y borde al 100 % */
const SEC_COLOR = { "Old": "#E9E9E9", "In progress": "#8A38F5" };
function secStyle(sec, status) { const c = SEC_COLOR[status]; if (!c || !sec) return; try { sec.fills = [{ type: "SOLID", color: hex(c), opacity: 0.1 }]; sec.strokes = [{ type: "SOLID", color: hex(c), opacity: 1 }]; } catch (e) { dsErrors.push("color sección: " + String(e && e.message || e).slice(0, 60)); } }
const secOf = n => { let p = n.parent; while (p && p.type !== "SECTION" && p.type !== "PAGE") p = p.parent; return p && p.type === "SECTION" ? p : null; };
let tareaKey = null;
if (tareaSet) { const defs = tareaSet.componentPropertyDefinitions || {}; tareaKey = Object.keys(defs).find(k => defs[k].type === "VARIANT" && (defs[k].variantOptions || []).includes("In progress") && (defs[k].variantOptions || []).includes("Old")) || null; }
if (tareaSet && tareaKey) {
  for (const ins of page.findAllWithCriteria({ types: ["INSTANCE"] })) {
    try { const mc = await ins.getMainComponentAsync(); if (!mc || !mc.parent || mc.parent.id !== tareaSet.id) continue;
      const pk = Object.keys(ins.componentProperties).find(k => k === tareaKey || k.split("#")[0] === tareaKey) || tareaKey;
      if (ins.componentProperties[pk] && ins.componentProperties[pk].value !== "Old") { ins.setProperties({ [pk]: "Old" }); tareaOld++; } secStyle(secOf(ins), "Old"); } catch (e) { dsErrors.push("tarea old: " + String(e && e.message || e).slice(0, 60)); }
  }
}
const dNow = new Date(), dd = n => String(n).padStart(2, "0");
const secName = META.sectionName || `(${dd(dNow.getDate())}.${dd(dNow.getMonth() + 1)}.${String(dNow.getFullYear()).slice(2)}) ${META.title || META.pageName}`;
const section = figma.createSection(); section.name = secName; section.x = placeX; section.y = placeY;
secStyle(section, "In progress");
const PAD = 80, GAP = 240, TOP = 120;
let docX = PAD;
if (tareaSet && tareaKey) {
  try { const vIP = tareaSet.children.find(c => (c.variantProperties || {})[tareaKey] === "In progress") || tareaSet.defaultVariant;
    const t = vIP.createInstance(); section.appendChild(t); t.x = PAD; t.y = TOP;
    const tt = t.findOne(n => n.type === "TEXT"); if (tt) { await figma.loadFontAsync(tt.fontName); tt.characters = String(META.title || META.pageName); }
    docX = PAD + t.width + 96; tareaNew = true; } catch (e) { dsErrors.push("tarea: " + String(e && e.message || e).slice(0, 60)); }
}
/* Nota con el design asset «Documentación» (etiqueta, título, subtítulo y texto) */
let docComp = null, docOk = false;
if (META.note) {
  try { if (META.docCompId) { const n = await figma.getNodeByIdAsync(META.docCompId); if (n && n.type === "COMPONENT") docComp = n; } } catch (e) {}
  if (!docComp) for (const pg of figma.root.children) { if (pg.name !== "Design assets") continue; try { await pg.loadAsync(); } catch (e) {} docComp = pg.findOne(n => n.type === "COMPONENT" && n.name === "Documentación"); if (docComp) break; }
  if (!docComp) for (const pg of figma.root.children) { try { await pg.loadAsync(); } catch (e) {} const f = pg.findOne(n => n.type === "COMPONENT" && n.name === "Documentación"); if (f) { docComp = f; break; } }
}
if (docComp) {
  try { const di = docComp.createInstance(); section.appendChild(di); di.x = docX; di.y = TOP;
    const T = di.findAll(n => n.type === "TEXT"); const vals = [META.note.label, META.title, META.note.heading, META.note.text];
    for (let i = 0; i < T.length && i < vals.length; i++) { const t = T[i]; const fn = t.fontName; if (fn !== figma.mixed) await figma.loadFontAsync(fn); else for (const f of t.getRangeAllFontNames(0, t.characters.length)) await figma.loadFontAsync(f); t.characters = String(vals[i] || ""); }
    docOk = true; } catch (e) { dsErrors.push("nota: " + String(e && e.message || e).slice(0, 60)); }
}
const doc = al("VERTICAL", { name: "Documentación", itemSpacing: 14, paddingTop: 28, paddingBottom: 28, paddingLeft: 28, paddingRight: 28, cornerRadius: 16 }); section.appendChild(doc);
doc.fills = [{ type: "SOLID", color: hex("#FFFFFF") }]; doc.resize(440, 100); doc.counterAxisSizingMode = "FIXED"; doc.primaryAxisSizingMode = "AUTO"; doc.x = docX; doc.y = TOP;
async function dt(s, style, color) { if (docOk) return; const t = await txt(s, style); t.fills = [{ type: "SOLID", color: hex(color) }]; fillW(doc, t); }
await dt(META.key + " · v" + META.version, "Label/Small", "#6B6B6B");
await dt(META.title, "Heading/Large", "#000000");
for (const sec of (META.sections || [])) { await dt(sec.h, "Label/Medium", "#8A6A00"); for (const it of (sec.items || [])) await dt("• " + it, "Body/Medium", "#141414"); }
await dt("Prototipo: pulsa Presentar (▶) en Figma y elige el flujo «" + META.pageName + "». Flecha continua: transición definida por el arquitecto UX. Flecha discontinua: pestañas de la barra inferior (desde la primera pantalla). Etiqueta discontinua: pantalla que no forma parte de esta propuesta.", "Caption", "#6B6B6B");
if (docOk) doc.remove();
const ids = [], frames = {};
let x = docX + 440 + GAP;
for (let i = 0; i < (SPEC.screens || []).length; i++) {
  const s = SPEC.screens[i];
  const lab = al("VERTICAL", { name: "Etiqueta / " + (s.name || i + 1), itemSpacing: 2 }); section.appendChild(lab); lab.resize(W, 10); lab.counterAxisSizingMode = "FIXED"; lab.primaryAxisSizingMode = "AUTO";
  const l1 = await txt((i + 1) + ". " + (s.name || "Pantalla"), "Label/Large"); l1.fills = [{ type: "SOLID", color: hex("#000000") }]; fillW(lab, l1);
  if (s.purpose) { const l2 = await txt(s.purpose, "Body/Medium"); l2.fills = [{ type: "SOLID", color: hex("#4A4A4A") }]; fillW(lab, l2); }
  lab.x = x; lab.y = TOP - 8 - lab.height;
  const sc = await screen(s); section.appendChild(sc); sc.x = x; sc.y = TOP; ids.push(sc.id); frames[s.id] = sc;
  x += W + GAP;
}
let maxB = TOP + H;
for (const n of section.children) maxB = Math.max(maxB, n.y + n.height);
/* Flechas del flujo */
const ARROW = hex("#141414");
const rel = n => { const a = n.absoluteBoundingBox, o = section.absoluteBoundingBox; return { x: a.x - o.x, y: a.y - o.y, w: a.width, h: a.height }; };
async function arrow(pts, label, opt) {
  opt = opt || {};
  const minX = Math.min(...pts.map(p => p[0])), minY = Math.min(...pts.map(p => p[1]));
  const v = figma.createVector(); v.name = "Flecha" + (label ? " / " + label : "");
  await v.setVectorNetworkAsync({ vertices: pts.map((p, i) => Object.assign({ x: p[0] - minX, y: p[1] - minY }, i === pts.length - 1 ? { strokeCap: "ARROW_LINES" } : {})), segments: pts.slice(1).map((p, i) => ({ start: i, end: i + 1 })) });
  v.strokes = [{ type: "SOLID", color: opt.color || ARROW }]; v.strokeWeight = opt.dash ? 2 : 3; v.strokeJoin = "ROUND"; v.fills = []; if (opt.dash) v.dashPattern = [8, 6];
  section.appendChild(v); v.x = minX; v.y = minY;
  if (label) {
    const t = await txt(String(label).slice(0, 40), "Label/Small"); t.fills = [{ type: "SOLID", color: hex("#000000") }];
    const pill = al("HORIZONTAL", { name: "Etiqueta flecha", paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4, cornerRadius: 99 }); pill.fills = [{ type: "SOLID", color: hex(opt.pill || "#FFC800") }]; if (opt.pillStroke) { pill.strokes = [{ type: "SOLID", color: hex(opt.pillStroke) }]; pill.strokeWeight = 1.5; pill.dashPattern = [4, 3]; } pill.appendChild(t); section.appendChild(pill);
    const si = opt.seg || 0; const a = pts[si], b = pts[si + 1];
    if (opt.end) { const e = pts[pts.length - 1]; pill.x = e[0] + 4; pill.y = e[1] - pill.height / 2; }
    else if (opt.atEnd) { pill.x = a[0] + 8; pill.y = a[1] - pill.height - 4; }
    else { pill.x = Math.min(a[0], b[0]) + 8; pill.y = (b[1] === a[1] ? a[1] : (a[1] + b[1]) / 2) - pill.height - 4; }
  }
}
let above = 0, below = 0;
/* Conectores nativos de Figma: se duplica el conector de referencia de «Design assets» (o META.connectorId) */
let CONN = null;
try { if (META.connectorId) { const n = await figma.getNodeByIdAsync(META.connectorId); if (n && n.type === "CONNECTOR") CONN = n; } } catch (e) {}
if (!CONN) for (const pg of figma.root.children) { if (pg.name !== "Design assets") continue; try { await pg.loadAsync(); } catch (e) {} CONN = pg.findOne(n => n.type === "CONNECTOR"); if (CONN) break; }
let connFont = null; if (CONN) { try { await figma.loadFontAsync({ family: "Inter", style: "Medium" }); connFont = { family: "Inter", style: "Medium" }; } catch (e) {} }
/* Un conector no puede salir de una capa interna de un componente: sube hasta la instancia exterior */
const anchorOf = n => { let a = n, p = n.parent; while (p && p !== section && p.type !== "PAGE") { if (p.type === "INSTANCE") a = p; p = p.parent; } return a; };
async function conn(startNode, startMag, end, label, dashed) {
  const c = CONN.clone(); section.appendChild(c);
  c.connectorStart = { endpointNodeId: anchorOf(startNode).id, magnet: startMag };
  c.connectorEnd = end.node ? { endpointNodeId: end.node.id, magnet: end.mag } : { position: end.pos };
  if (dashed) { try { c.dashPattern = [10, 8]; } catch (e) {} }
  if (label && connFont) { try { c.text.fontName = connFont; c.text.characters = String(label).slice(0, 40); c.text.fontSize = 14; } catch (e) {} }
  c.name = "Flecha" + (label ? " / " + label : "");
  return c;
}
const order = Object.values(frames).map(f => f.id); const fi = n => order.indexOf(n.id); const pairs = new Set(); const low = [];
const firstTab = (() => { const t = LINKS.filter(L => L.tab && frames[L.to]).map(L => { let n = L.node; while (n && n.parent && n.parent !== section) n = n.parent; return n ? fi(n) : 99; }); return t.length ? Math.min(...t) : -1; })();
for (const L of LINKS) {
  if (L.node && String(L.to || "").startsWith("ext:")) {
    const srcF = (() => { let n = L.node; while (n && n.parent && n.parent !== section) n = n.parent; return n; })(); if (!srcF) continue;
    const r = rel(L.node), sf = rel(srcF), sy = r.y + r.h / 2;
    if (CONN) { try {
        /* Un conector sin destino sale de la sección: termina en una etiqueta discontinua con el nombre de la pantalla que no se incluye */
        const nb = anchorOf(L.node).absoluteBoundingBox, ab = srcF.absoluteBoundingBox, sb = section.absoluteBoundingBox;
        const pill = al("HORIZONTAL", { name: "Fuera de alcance / " + String(L.to).slice(4), paddingLeft: 12, paddingRight: 12, paddingTop: 8, paddingBottom: 8, cornerRadius: 99 });
        pill.fills = [{ type: "SOLID", color: hex("#FFFFFF") }]; pill.strokes = [{ type: "SOLID", color: hex("#6B6B6B") }]; pill.strokeWeight = 1.5; pill.dashPattern = [4, 3];
        const pt = await txt(String(L.to).slice(4, 34), "Label/Small"); pt.fills = [{ type: "SOLID", color: hex("#141414") }]; pill.appendChild(pt); section.appendChild(pill);
        pill.x = (ab.x - sb.x) + ab.width + 40; pill.y = (nb.y - sb.y) + nb.height / 2 - pill.height / 2;
        await conn(L.node, "RIGHT", { node: pill, mag: "LEFT" }, "", true); continue; }
      catch (e) { dsErrors.push("conector: " + String(e && e.message || e).slice(0, 60)); } }
    await arrow([[sf.x + sf.w, sy], [sf.x + sf.w + 36, sy]], "→ " + String(L.to).slice(4), { dash: true, color: hex("#6B6B6B"), end: true, pill: "#FFFFFF", pillStroke: "#6B6B6B" });
    continue;
  }
  const tgt = frames[L.to]; if (!tgt || !L.node) continue;
  const srcFrame = (() => { let n = L.node; while (n && n.parent && n.parent !== section) n = n.parent; return n; })();
  if (!srcFrame || srcFrame === tgt) continue;
  try {
    const live = (await figma.getNodeByIdAsync(L.node.id)) || L.node;
    await live.setReactionsAsync([{ trigger: { type: "ON_CLICK" }, actions: [{ type: "NODE", destinationId: tgt.id, navigation: "NAVIGATE", transition: { type: "SMART_ANIMATE", easing: { type: "EASE_OUT" }, duration: 0.3 }, resetScrollPosition: true }] }]);
    if (!(live.reactions || []).length) dsErrors.push("prototipo sin enlace: " + (L.label || live.name));
  } catch (e) { dsErrors.push("prototipo: " + String(e && e.message || e).slice(0, 60)); }
  if (L.tab && fi(srcFrame) !== firstTab) continue;
  const pk = [Math.min(fi(srcFrame), fi(tgt)), Math.max(fi(srcFrame), fi(tgt))].join("-"); if (pairs.has(pk)) continue; pairs.add(pk);
  if (CONN) { try { const fwd = fi(tgt) > fi(srcFrame), adj = Math.abs(fi(tgt) - fi(srcFrame)) === 1;
      await conn(L.node, L.tab ? "BOTTOM" : (fwd && adj ? "RIGHT" : "BOTTOM"), { node: tgt, mag: L.tab ? "BOTTOM" : (fwd && adj ? "LEFT" : "BOTTOM") }, L.label, !!L.tab); continue; }
    catch (e) { dsErrors.push("conector: " + String(e && e.message || e).slice(0, 60)); } }
  const r = rel(L.node), sf = rel(srcFrame), tf = rel(tgt);
  if (L.tab) { low.push({ sx: r.x + r.w / 2, sy: sf.y + sf.h, ex: tf.x + tf.w / 2, ey: tf.y + tf.h + 6, dist: Math.abs(fi(tgt) - fi(srcFrame)), label: L.label, tab: true }); continue; }
  const sy = r.y + r.h / 2;
  if (tf.x > sf.x) {
    if (tf.x - (sf.x + sf.w) <= GAP + 1) { const mx = sf.x + sf.w + GAP / 2; const ty = Math.min(tf.y + tf.h - 40, Math.max(tf.y + 40, sy)); await arrow([[sf.x + sf.w, sy], [mx, sy], [mx, ty], [tf.x - 6, ty]], L.label); }
    else low.push({ sx: r.x + r.w / 2, sy: sf.y + sf.h, ex: tf.x + tf.w / 2, ey: tf.y + tf.h + 6, dist: Math.abs(fi(tgt) - fi(srcFrame)), label: L.label });
  } else low.push({ sx: r.x + r.w / 2, sy: sf.y + sf.h, ex: tf.x + tf.w / 2, ey: tf.y + tf.h + 6, dist: Math.abs(fi(tgt) - fi(srcFrame)), label: L.label });
}
/* Flechas por debajo: las más lejanas en el carril más cercano a las pantallas para que no se crucen; etiqueta junto a la pantalla de destino */
low.sort((p, q) => q.dist - p.dist);
for (let k = 0; k < low.length; k++) { const L = low[k]; const yy = maxB + 60 + k * 34;
  await arrow([[L.sx, L.sy], [L.sx, yy], [L.ex, yy], [L.ex, L.ey]], L.label, L.tab ? { dash: true, color: hex("#6B6B6B"), seg: 2, atEnd: true } : { seg: 2, atEnd: true }); }
for (const n of BACKS) { try { await n.setReactionsAsync([{ trigger: { type: "ON_CLICK" }, actions: [{ type: "BACK" }] }]); } catch (e) {} }
let mx = 0, my = 0, mnY = 0;
for (const n of section.children) { mx = Math.max(mx, n.x + n.width); my = Math.max(my, n.y + n.height); mnY = Math.min(mnY, n.y); }
if (mnY < PAD) { const d = PAD - mnY; for (const n of section.children) n.y += d; my += d; }
section.resizeWithoutConstraints(mx + PAD, my + PAD);
if (ids.length) { try { const fs = (page.flowStartingPoints || []).filter(f => f.nodeId !== ids[0]); page.flowStartingPoints = fs.concat([{ nodeId: ids[0], name: META.pageName }]); } catch (e) { dsErrors.push("flujo: " + String(e && e.message || e).slice(0, 60)); } }
figma.viewport.scrollAndZoomIntoView([section]);
return { pageId: page.id, pageName: page.name, fallback, nodeId: section.id, sectionName: section.name, tareaOld, tareaNew, inSection: true, screenIds: ids, links: LINKS.length, dsUsed: [...usedDs], dsErrors: dsErrors.slice(0, 12) };
