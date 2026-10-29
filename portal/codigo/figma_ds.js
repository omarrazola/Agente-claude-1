/* ===== Componentes reales del sistema de diseño (librería) ===== */
const DS = SPEC.dsLib || null;
const _sets = {};
const _fontsLoaded = new Set();
async function dsSet(name) {
  if (!DS || !DS.samples || !DS.samples[name]) return null;
  if (name in _sets) return _sets[name];
  try { const i = await figma.getNodeByIdAsync(DS.samples[name]); const m = i && (await i.getMainComponentAsync()); _sets[name] = m ? (m.parent && m.parent.type === "COMPONENT_SET" ? m.parent : m) : null; }
  catch (e) { _sets[name] = null; }
  return _sets[name];
}
async function dsInst(name, props) {
  const set = await dsSet(name); if (!set) return null;
  let target = set;
  if (set.type === "COMPONENT_SET") {
    let best = null, bs = -1;
    for (const c of set.children) { const vp = c.variantProperties || {}; let s = 0; for (const [k, v] of Object.entries(props || {})) if (vp[k] === v) s += 2; if (vp.State === "Enabled") s += 1; if (s > bs) { bs = s; best = c; } }
    target = best || set.defaultVariant;
  }
  return target.createInstance();
}
const _badFonts = new Set();
function interStyle(st) { st = String(st || ""); if (/black|heavy|extra ?bold/i.test(st)) return "Bold"; if (/bold/i.test(st)) return /semi/i.test(st) ? "Semi Bold" : "Bold"; if (/medium/i.test(st)) return "Medium"; return "Regular"; }
async function ensureFont(t) {
  let fonts = []; try { fonts = t.getRangeAllFontNames(0, Math.max(1, t.characters.length)); } catch (e) { fonts = []; }
  let swap = null;
  for (const f of fonts) { const k = f.family + "|" + f.style; if (_fontsLoaded.has(k)) continue; if (_badFonts.has(k)) { swap = f; continue; } try { await figma.loadFontAsync(f); _fontsLoaded.add(k); } catch (e) { _badFonts.add(k); swap = f; } }
  if (swap) { const fn = { family: "Inter", style: interStyle(swap.style) }; await figma.loadFontAsync(fn); t.fontName = fn; }
}
async function setText(t, value) { await ensureFont(t); t.characters = String(value); }
async function setProp(inst, name, value) {
  const k = Object.keys(inst.componentProperties).find(x => x.split("#")[0] === name);
  if (!k) return false;
  try {
    if (typeof value === "string") {
      const nodes = inst.findAllWithCriteria({ types: ["TEXT"] }).filter(t => t.componentPropertyReferences && t.componentPropertyReferences.characters === k);
      if (!nodes.length) return false;
      for (const t of nodes) await setText(t, value);
      return true;
    }
    inst.setProperties({ [k]: value }); return true;
  } catch (e) { return false; }
}
async function setTexts(inst, layerName, values) {
  const nodes = inst.findAllWithCriteria({ types: ["TEXT"] }).filter(t => t.name === layerName);
  for (let i = 0; i < nodes.length && i < values.length; i++) { if (values[i] == null) continue; if (values[i] === false) { nodes[i].visible = false; continue; } await setText(nodes[i], values[i]); }
  return nodes.length;
}
async function nestedVariant(inst, setName, props) {
  for (const n of inst.findAllWithCriteria({ types: ["INSTANCE"] })) { const m = await n.getMainComponentAsync(); const owner = m && m.parent && m.parent.type === "COMPONENT_SET" ? m.parent : m; if (owner && owner.name === setName) { try { n.setProperties(props); } catch (e) {} return true; } }
  return false;
}
function fillW(parent, node) { parent.appendChild(node); try { node.layoutSizingHorizontal = "FILL"; } catch (e) {} return node; }
const TAGCOLOR = { gray: "Gray", accent: "Blue", info: "Blue", positive: "Green", success: "Green", warning: "Yellow", negative: "Red", error: "Red", solid: "Gray" };
const BANNERSTYLE = { info: "Accent", accent: "Accent", success: "Positive", positive: "Positive", warning: "Warning", error: "Negative", negative: "Negative" };
const usedDs = new Set();
async function dsBlock(parent, b) {
  if (!DS) return false;
  const k = b.t;
  if (k === "button") {
    const h = { primary: "Primary", secondary: "Secondary", ghost: "Tertiary", danger: "Primary" }[b.variant || "primary"] || "Primary";
    const i = await dsInst("Button", { Hierarchy: h, Size: "Large", Shape: "Rect", Layout: "Label only", State: "Enabled", Behavior: "Fixed width" }); if (!i) return false;
    fillW(parent, i); if (!(await setProp(i, "Label", b.label || ""))) await setTexts(i, "Label", [b.label]); usedDs.add("Button"); return true;
  }
  if (k === "input" || k === "search") {
    const nm = k === "search" ? "Search field" : "Text field";
    const st = b.error ? "Error" : b.value ? "Complete" : "Enabled";
    const i = await dsInst(nm, { Size: "Large", State: st }); if (!i) return false;
    fillW(parent, i);
    await setTexts(i, "Text", [b.label || "", b.value || b.placeholder || "", b.error || b.helper || ""]);
    await setProp(i, "Label", !!b.label); await setProp(i, "Hint", !!(b.error || b.helper));
    usedDs.add(nm); return true;
  }
  if (k === "banner") {
    const i = await dsInst("Banner", { Hierarchy: "Low", Layout: "Simple", Artwork: "Icon", Style: BANNERSTYLE[b.tone] || "Accent" }); if (!i) return false;
    fillW(parent, i);
    await setProp(i, "Heading", !!b.title); if (b.title) await setProp(i, "Heading text", b.title);
    await setProp(i, "Paragraph text", b.text || ""); usedDs.add("Banner"); return true;
  }
  if (k === "list") {
    const g = put(parent, al("VERTICAL", { name: "List", itemSpacing: 0 }));
    const items = b.items || [];
    for (let n = 0; n < items.length; n++) {
      const it = items[n]; const trailing = it.trailing && it.trailing !== "›";
      const i = await dsInst("List item", { Size: "Standard", Artwork: it.lead ? "Small" : "None", Layout: trailing ? "Label trailing" : (it.trailing === "›" || it.chevron ? "Chevron" : "Simple"), "Platform Device": "All", State: "Enabled" });
      if (!i) { g.remove(); return false; }
      fillW(g, i);
      await setTexts(i, "Label leading", [it.title || ""]); await setTexts(i, "Paragraph leading", [it.subtitle ? it.subtitle : false]);
      if (trailing) { await setTexts(i, "Label trailing", [it.trailing]); await setTexts(i, "Paragraph trailing", [false]); }
      await setProp(i, "Divider", n < items.length - 1);
    }
    usedDs.add("List item"); return true;
  }
  if (k === "option") {
    const wrap = put(parent, al("VERTICAL", { name: "Option / " + (b.title || ""), cornerRadius: 12, clipsContent: true }));
    if (b.selected) { wrap.strokes = paint(T.text); wrap.strokeWeight = 3; wrap.strokeAlign = "INSIDE"; }
    const i = await dsInst("List item", { Size: "Standard", Artwork: "Large", Layout: "Label trailing", "Platform Device": "All", State: "Enabled" }); if (!i) { wrap.remove(); return false; }
    fillW(wrap, i);
    await setTexts(i, "Label leading", [(b.title || "") + (b.capacity ? "  · " + b.capacity + " pers." : "")]);
    await setTexts(i, "Paragraph leading", [b.subtitle ? b.subtitle : false]);
    await setTexts(i, "Label trailing", [b.price || ""]); await setTexts(i, "Paragraph trailing", [b.badge && b.badge.text ? b.badge.text : false]);
    await setProp(i, "Divider", false); usedDs.add("List item"); return true;
  }
  if (k === "check") {
    const lay = b.kind === "radio" ? "Radio" : b.kind === "toggle" ? "Switch" : "Check";
    const i = await dsInst("List item", { Size: "Standard", Artwork: "None", Layout: lay, "Platform Device": lay === "Switch" ? "Android + web" : "All", State: "Enabled" }); if (!i) return false;
    fillW(parent, i); await setTexts(i, "Label leading", [b.label || ""]); await setTexts(i, "Paragraph leading", [false]); await setProp(i, "Divider", false);
    if (lay === "Radio") await nestedVariant(i, "Radio", { "Selected Unselected": b.checked ? "Selected" : "Unselected" });
    if (lay === "Check") await nestedVariant(i, "Check", { Behavior: b.checked ? "Selected" : "Unselected" });
    if (lay === "Switch") await nestedVariant(i, "Switch", { Behavior: b.checked ? "On" : "Off" });
    usedDs.add("List item"); return true;
  }
  if (k === "chips" || k === "tags") {
    const r = put(parent, al("HORIZONTAL", { name: "Tags", itemSpacing: 8, counterAxisSpacing: 8, layoutWrap: "WRAP" }));
    for (const s of (b.items || [])) {
      const it = typeof s === "object" && s ? s : { text: s };
      const i = await dsInst("Tag", { Behavior: "Display", Hierarchy: it.tone === "solid" ? "Primary" : "Secondary", "Color style": TAGCOLOR[it.tone || "gray"] || "Gray", Size: "Small", State: "Enabled", Selected: "False" });
      if (!i) { r.remove(); return false; }
      r.appendChild(i); if (!(await setProp(i, "Text", it.text || ""))) await setTexts(i, "Label", [it.text]);
    }
    usedDs.add("Tag"); return true;
  }
  if (k === "tabs") {
    const items = (b.items || []).slice(0, 7); if (items.length < 2) return false;
    const i = await dsInst("Tabs", { Width: "Fixed", "Selected index": "Tab " + Math.min(items.length, (b.active || 0) + 1) }); if (!i) return false;
    fillW(parent, i);
    for (let n = 3; n <= 7; n++) await setProp(i, "Tab " + n, n <= items.length);
    await setTexts(i, "Label", items); usedDs.add("Tabs"); return true;
  }
  if (k === "heading" || k === "text") {
    const props = k === "heading" ? { Class: "Heading", Size: ({ 1: "Large", 2: "Small", 3: "X small" })[b.level || 1] || "Small" } : { Class: "Paragraph", Size: b.size === "s" ? "Small" : "Medium" };
    const i = await dsInst("Typography", props); if (!i) return false;
    fillW(parent, i); await setProp(i, "Spacer", false);
    if (!(await setProp(i, "Text", b.text || ""))) await setTexts(i, "Text", [b.text]);
    usedDs.add("Typography"); return true;
  }
  if (k === "progress") {
    const i = await dsInst("Progress bar - Determinate", { Size: "Medium", Layout: b.label ? "Label" : "Label none" }); if (!i) return false;
    fillW(parent, i); if (b.label) await setTexts(i, "Label", [b.label]); usedDs.add("Progress bar"); return true;
  }
  if (k === "divider") { const i = await dsInst("Divider", { Class: "Cell" }); if (!i) return false; fillW(parent, i); usedDs.add("Divider"); return true; }
  if (k === "card") {
    const i = await dsInst("Message card", { Layout: b.body ? "Headline + paragraph" : "Headline", "Sub layout": b.cta ? "Button tertiary" : "Button none", Style: "Light", Artwork: "Artwork trailing", State: "Enabled" }); if (!i) return false;
    fillW(parent, i); await setTexts(i, "Text", [b.title || b.meta || "", b.body || ""]); if (b.cta) await setTexts(i, "Label", [b.cta]); await setProp(i, "Dismiss button", false);
    usedDs.add("Message card"); return true;
  }
  if (k === "avatar") {
    const r = put(parent, al("HORIZONTAL", { name: "Avatar", itemSpacing: 12, counterAxisAlignItems: "CENTER" }));
    const i = await dsInst("Avatar", { Artwork: "Generic person", Size: "Medium" }); if (!i) { r.remove(); return false; }
    r.appendChild(i); const col = put(r, al("VERTICAL", { itemSpacing: 2 }));
    putText(col, txt(b.name, 16, "Medium")); if (b.detail) putText(col, txt(b.detail, 14, "Regular", T.textSecondary));
    usedDs.add("Avatar"); return true;
  }
  return false;
}
async function dsBar(f, b) {
  const i = await dsInst("Navigation header", { Behavior: "Fixed", Device: "iOS", State: "Collapsed", Layout: "Icon leading + actions" }); if (!i) return false;
  fillW(f, i); await setTexts(i, "Title", [b.title || ""]); await setProp(i, "Action left", !!b.left); await setProp(i, "Action primary", false); await setProp(i, "Action secondary", false);
  usedDs.add("Navigation header"); return true;
}
async function dsNav(f, b) {
  const items = (b.items || []).slice(0, 5); if (items.length < 2) return false;
  const i = await dsInst("Bottom navigation", { Display: "Narrow", "Selected index": "Tab " + Math.min(items.length, (b.active || 0) + 1) }); if (!i) return false;
  fillW(f, i); await setProp(i, "3rd tab", items.length >= 3); await setProp(i, "4th tab", items.length >= 4); await setProp(i, "5th tab", items.length >= 5);
  for (let n = 0; n < items.length; n++) await setTexts(i, "Label " + (n + 1), [items[n]]);
  usedDs.add("Bottom navigation"); return true;
}
