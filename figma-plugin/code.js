// Portal Rumbo - AI Design Bridge Plugin
figma.showUI(__html__, { width: 360, height: 540, themeColors: true });

function getPages() {
  const pages = [];
  for (const p of figma.root.children) {
    let sections = 0;
    try {
      sections = p.children.filter(c => c.type === "SECTION").length;
    } catch (e) {}
    pages.push({ id: p.id, name: p.name, sections });
  }
  return pages;
}

function sendPages() {
  const pages = getPages();
  const fileKey = figma.fileKey || null;
  const fileName = figma.root ? figma.root.name : "Untitled";
  figma.ui.postMessage({
    type: "PAGES_LIST",
    pages,
    fileKey,
    fileName,
    currentPage: figma.currentPage.name
  });
}

// Enviar estado inicial
setTimeout(() => {
  sendPages();
}, 200);

figma.on("currentpagechange", () => {
  sendPages();
});

figma.ui.onmessage = async (msg) => {
  if (msg.type === "GET_PAGES") {
    sendPages();
    return;
  }

  if (msg.type === "EXECUTE_CODE") {
    const { jobId, code } = msg;
    try {
      // Preprocesar código para compatibilidad total con Figma nativo
      let sanitizedCode = String(code || "");
      if (sanitizedCode.includes("figma.createAutoLayout")) {
        const helper = `
function __createAutoLayout(dir, props) {
  const f = figma.createFrame();
  f.layoutMode = dir === "HORIZONTAL" ? "HORIZONTAL" : "VERTICAL";
  f.fills = [];
  f.strokes = [];
  f.set = function(p) {
    if (p && typeof p === "object") {
      for (const [k, v] of Object.entries(p)) {
        try {
          if (k === "itemSpacing" || k === "paddingLeft" || k === "paddingRight" || k === "paddingTop" || k === "paddingBottom" || k === "cornerRadius" || k === "counterAxisSpacing") {
            f[k] = Number(v) || 0;
          } else {
            f[k] = v;
          }
        } catch (e) {}
      }
    }
    return f;
  };
  if (props) f.set(props);
  return f;
}
`;
        sanitizedCode = helper + "\n" + sanitizedCode.replace(/figma\.createAutoLayout\s*\(/g, "__createAutoLayout(");
      }

      // Ejecución segura y directa sobre el objeto figma nativo
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const runner = new AsyncFunction("figma", sanitizedCode);
      const result = await runner(figma);
      
      sendPages();
      figma.notify("✨ Propuesta importada y dibujada con éxito en Figma");

      figma.ui.postMessage({
        type: "EXECUTE_RESULT",
        jobId,
        success: true,
        result: result || { success: true, pageName: figma.currentPage.name }
      });
    } catch (err) {
      console.error("[Figma Bridge] Error ejecutando código:", err);
      figma.notify("⚠️ Error al importar diseño: " + err.message, { error: true });
      figma.ui.postMessage({
        type: "EXECUTE_RESULT",
        jobId,
        success: false,
        error: err.message
      });
    }
    return;
  }

  if (msg.type === "READ_SELECTION") {
    const selection = figma.currentPage.selection;
    if (!selection || selection.length === 0) {
      figma.notify("Selecciona una o más pantallas/frames para sincronizar.");
      figma.ui.postMessage({
        type: "SELECTION_DATA",
        nodes: []
      });
      return;
    }

    const nodesData = selection.map(node => {
      const texts = [];
      if ("findAll" in node) {
        try {
          const textNodes = node.findAll(n => n.type === "TEXT");
          for (const t of textNodes) {
            texts.push({ name: t.name, text: t.characters });
          }
        } catch (e) {}
      }
      return {
        id: node.id,
        name: node.name,
        type: node.type,
        width: node.width,
        height: node.height,
        texts
      };
    });

    figma.notify(`✓ ${selection.length} elemento(s) preparado(s) para enviar al Agente.`);
    figma.ui.postMessage({
      type: "SELECTION_DATA",
      nodes: nodesData,
      pageName: figma.currentPage.name
    });
  }
};
