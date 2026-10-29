const D={"title": "Identidad verbal", "intro": "Cómo habla Rumbo en la app. Úsalo al escribir cualquier texto de interfaz: botones, títulos, avisos, errores y notificaciones.", "esencia": "Rumbo habla como un buen conductor de confianza: claro, cercano y tranquilo. Te dice lo que necesitas saber, cuando lo necesitas, y te deja seguir con tu viaje.", "rasgos": [{"n": "Claro", "si": "Una idea por frase. Palabras de todos los días.", "no": "Confuso ni técnico.", "ok": "Tu conductor llega en 4 min", "ko": "ETA estimado del partner: 240 s"}, {"n": "Cercano", "si": "Tuteamos y hablamos como una persona.", "no": "Coloquial ni gracioso a destiempo.", "ok": "¿A dónde vas?", "ko": "¡Ey, crack! ¿Dónde te llevamos? 🚕"}, {"n": "Tranquilo", "si": "Damos seguridad, sobre todo cuando algo falla.", "no": "Alarmista ni culpabilizador.", "ok": "No hemos podido cobrar la propina. Reinténtalo o cambia de tarjeta.", "ko": "¡ERROR! Tu pago ha sido rechazado."}, {"n": "Directo", "si": "Vamos al grano y decimos qué hacer.", "no": "Seco ni robótico.", "ok": "Confirmar Confort", "ko": "Aceptar"}], "tono": [{"m": "Pedir un viaje", "t": "Ágil", "d": "Lo justo para decidir: precio, tiempo y tipo de vehículo.", "e": "Rumbo X · 4 · 11:55 · 6 min"}, {"m": "Esperando al conductor", "t": "Tranquilizador", "d": "Quién viene, cuándo y cómo reconocerlo.", "e": "Carlos llega en 3 min · Toyota Corolla blanco"}, {"m": "Durante el viaje", "t": "Discreto", "d": "Solo lo que cambia: llegada, paradas, ruta.", "e": "Llegas a las 12:20"}, {"m": "Pagos y errores", "t": "Sereno y útil", "d": "Qué pasó y qué hacer, sin culpar.", "e": "No se ha podido cobrar. Cambia de tarjeta para continuar."}, {"m": "Seguridad", "t": "Serio", "d": "Frases cortas y acción inmediata. Sin adornos.", "e": "Comparte tu viaje con un contacto de confianza"}, {"m": "Promociones", "t": "Animado, sin exagerar", "d": "El beneficio primero, con condiciones claras.", "e": "20 % en tu próximo viaje en Taxi hasta el domingo"}], "reglas": [["Tuteo siempre", "Habla a una persona: «Elige un viaje», no «Seleccione un servicio»."], ["Frases cortas", "Una idea por frase. Si necesitas dos, usa dos frases."], ["Mayúscula solo al inicio", "«Cancelar viaje», no «Cancelar Viaje». Los nombres de producto sí van con mayúscula: Rumbo X, Comfort."], ["Botones con verbo", "Verbo + objeto: «Confirmar Confort», «Cambiar tarjeta». Evita «Aceptar» u «OK»."], ["Errores: qué pasó y qué hacer", "Primero el problema en palabras sencillas, después la salida."], ["Precios y tiempos con formato local", "12,40 € · 4 min · 11:55 · 20 km. Sin decimales en tiempos."], ["Sin emojis ni jerga interna", "Nada de «partner», «ETA», «surge» o «driver»."], ["Nunca solo color", "Acompaña los estados con una palabra o un icono: «Enviada», «Pagado»."]], "componentes": [["Botón", "Verbo + objeto, máx. 3 palabras.", "Confirmar Confort"], ["Título de pantalla", "Lo que la persona hace o ve aquí.", "Planifica tu viaje"], ["Banner", "Qué pasa y, si hace falta, qué hacer.", "Las tarifas son más altas de lo habitual"], ["Snackbar", "Confirmación breve en pasado.", "Propina enviada"], ["Diálogo", "Pregunta clara + botones que repiten la acción.", "¿Cancelar el viaje? · Cancelar viaje / Seguir esperando"], ["Estado vacío", "Qué no hay y cómo empezar.", "Aún no tienes viajes. Pide el primero desde Inicio."]], "glosario": [["Viaje", "carrera, trayecto, servicio"], ["Conductor", "chófer, driver, partner"], ["Recogida", "pickup, punto de encuentro"], ["Destino", "drop-off, punto de bajada"], ["Propina", "tip, gratificación"], ["Método de pago", "forma de cobro, medio de pago"], ["Actividad", "historial, mis viajes"], ["Programar", "reservar más tarde, schedule"]], "fuente": "Basado en las reglas de contenido del sistema Rumbo y en el tono definido por el UX Writer. Propuesta para revisar con el equipo."};
const C={bg:{r:0,g:0,b:0},card:{r:0.122,g:0.122,b:0.122},line:{r:0.2,g:0.2,b:0.2},tx:{r:1,g:1,b:1},mu:{r:0.686,g:0.686,b:0.686},br:{r:1,g:0.784,b:0},ok:{r:0.239,g:0.831,b:0.478},ko:{r:1,g:0.42,b:0.369}};
let FAM="Plus Jakarta Sans";
async function lf(st){ try{ await figma.loadFontAsync({family:FAM,style:st}); return true; }catch(e){ return false; } }
if(!(await lf("Regular"))||!(await lf("Bold"))){ FAM="Inter"; await figma.loadFontAsync({family:"Inter",style:"Regular"}); await figma.loadFontAsync({family:"Inter",style:"Bold"}); }
let SEMI="SemiBold"; if(!(await lf("SemiBold"))){ SEMI=FAM==="Inter"?"Semi Bold":"Bold"; await lf(SEMI); }
const solid=c=>[{type:"SOLID",color:c}];
function T(s,o){ o=o||{}; const t=figma.createText(); t.fontName={family:FAM,style:o.w||"Regular"}; t.characters=String(s); t.fontSize=o.sz||16; t.fills=solid(o.c||C.tx); t.lineHeight={value:o.lh||((o.sz||16)*1.45),unit:"PIXELS"}; if(o.ls) t.letterSpacing={value:o.ls,unit:"PERCENT"}; if(o.fill){ t.textAutoResize="HEIGHT"; } return t; }
function F(name,dir,o){ o=o||{}; const f=figma.createFrame(); f.name=name; f.layoutMode=dir; f.itemSpacing=o.gap||0; f.paddingTop=f.paddingBottom=o.py!=null?o.py:(o.p||0); f.paddingLeft=f.paddingRight=o.px!=null?o.px:(o.p||0);
  f.fills=o.bg?solid(o.bg):[]; if(o.r) f.cornerRadius=o.r; if(o.stroke){ f.strokes=solid(o.stroke); f.strokeWeight=1; } f.primaryAxisSizingMode="AUTO"; f.counterAxisSizingMode="AUTO"; if(o.left){ f.strokes=solid(o.left); f.strokeLeftWeight=3; f.strokeTopWeight=0; f.strokeRightWeight=0; f.strokeBottomWeight=0; } return f; }
function add(p,c,fill){ p.appendChild(c); if(fill){ c.layoutSizingHorizontal="FILL"; if(c.type==="TEXT") c.textAutoResize="HEIGHT"; } return c; }
function eyebrow(s){ return T(s.toUpperCase(),{sz:13,w:"Bold",c:C.br,ls:8}); }
function secHead(p,n,title,sub){ const h=add(p,F("Cabecera · "+title,"VERTICAL",{gap:8}),true); add(h,eyebrow(String(n).padStart(2,"0")+" · "+title)); if(sub) add(h,T(sub,{sz:18,c:C.mu}),true); return h; }
const COLS=new Map();
function grid(p,name,cols,gap){ const g=add(p,F(name,"HORIZONTAL",{gap:gap||16}),true); g.layoutWrap="WRAP"; g.counterAxisSpacing=gap||16; COLS.set(g.id,cols); return g; }
function cell(g,name,o){ const W=1280, gap=g.itemSpacing; const w=Math.floor((W-gap*(COLS.get(g.id)-1))/COLS.get(g.id)); const c=F(name,"VERTICAL",Object.assign({gap:10,p:24,bg:C.card,r:16},o||{})); g.appendChild(c); c.resize(w,c.height); c.layoutSizingHorizontal="FIXED"; c.layoutSizingVertical="HUG"; return c; }
function pill(p,s,col){ const f=add(p,F("Etiqueta","HORIZONTAL",{px:10,py:4,r:99,bg:{r:col.r*0.18,g:col.g*0.18,b:col.b*0.18}})); add(f,T(s,{sz:12,w:"Bold",c:col,lh:16})); return f; }

/* página destino: la del sistema de diseño */
let page=figma.root.children.find(p=>/design system|sistema|componentes|components/i.test(p.name))||figma.root.children[0];
await figma.setCurrentPageAsync(page);
const secs=page.children.filter(n=>n.type==="SECTION");
const old=page.children.find(n=>n.type==="SECTION"&&n.name===D.title); if(old) old.remove();
const others=page.children.filter(n=>n.type==="SECTION");
let X=0,Y=0; if(others.length){ X=Math.min(...others.map(n=>n.x)); Y=Math.max(...others.map(n=>n.y+n.height))+200; } else if(page.children.length){ X=Math.min(...page.children.map(n=>n.x)); Y=Math.max(...page.children.map(n=>n.y+n.height))+200; }

const root=F(D.title,"VERTICAL",{gap:72,p:80,bg:C.bg,r:24}); root.resize(1440,100); root.primaryAxisSizingMode="AUTO"; root.counterAxisSizingMode="FIXED";
/* portada */
const hero=add(root,F("Portada","VERTICAL",{gap:16}),true);
add(hero,eyebrow("Rumbo · Sistema de diseño"));
add(hero,T(D.title,{sz:64,w:"Bold",lh:72}),true);
add(hero,T(D.intro,{sz:20,c:C.mu,lh:30}),true);
const ess=add(root,F("Esencia","VERTICAL",{gap:8,px:32,py:28,bg:C.card,r:16,left:C.br}),true);
add(ess,T("Nuestra voz",{sz:13,w:"Bold",c:C.mu,ls:8}));
add(ess,T(D.esencia,{sz:28,w:SEMI,lh:40}),true);
/* 1 rasgos */
const s1=add(root,F("01 Rasgos","VERTICAL",{gap:24}),true);
secHead(s1,1,"Rasgos de la voz","Somos así en todos los textos. La columna «No somos» marca hasta dónde llega cada rasgo.");
const g1=grid(s1,"Rasgos",2,16);
for(const r of D.rasgos){ const c=cell(g1,"Rasgo · "+r.n,{gap:14});
  add(c,T(r.n,{sz:32,w:"Bold",lh:40}),true);
  const sn=add(c,F("Somos / No somos","VERTICAL",{gap:4}),true);
  add(sn,T("Somos: "+r.si,{sz:16}),true); add(sn,T("No somos: "+r.no,{sz:16,c:C.mu}),true);
  const ex=add(c,F("Ejemplos","VERTICAL",{gap:8}),true);
  const ok=add(ex,F("Sí","HORIZONTAL",{gap:10,px:14,py:12,r:10,bg:{r:0.05,g:0.17,b:0.1}}),true); ok.counterAxisAlignItems="CENTER"; pill(ok,"Sí",C.ok); add(ok,T(r.ok,{sz:15}),true);
  const ko=add(ex,F("No","HORIZONTAL",{gap:10,px:14,py:12,r:10,bg:{r:0.2,g:0.07,b:0.07}}),true); ko.counterAxisAlignItems="CENTER"; pill(ko,"No",C.ko); add(ko,T(r.ko,{sz:15,c:C.mu}),true); }
/* 2 tono */
const s2=add(root,F("02 Tono","VERTICAL",{gap:24}),true);
secHead(s2,2,"El tono cambia según el momento","La voz es siempre la misma; el tono se adapta a cómo se siente la persona en cada paso del viaje.");
const g2=grid(s2,"Momentos",3,16);
for(const m of D.tono){ const c=cell(g2,"Momento · "+m.m,{gap:10});
  add(c,T(m.m,{sz:14,w:"Bold",c:C.mu}),true); add(c,T(m.t,{sz:24,w:"Bold",c:C.br,lh:30}),true); add(c,T(m.d,{sz:15}),true);
  const e=add(c,F("Ejemplo","VERTICAL",{px:12,py:10,r:10,bg:C.bg}),true); add(e,T("«"+m.e+"»",{sz:14,c:C.mu}),true); }
/* 3 reglas */
const s3=add(root,F("03 Reglas","VERTICAL",{gap:24}),true);
secHead(s3,3,"Reglas de escritura","Lo básico que se cumple en cada texto.");
const g3=grid(s3,"Reglas",2,16);
D.reglas.forEach(([h,d],i)=>{ const c=cell(g3,"Regla · "+h,{gap:6,p:20}); const row=add(c,F("Título","HORIZONTAL",{gap:12}),true); row.counterAxisAlignItems="CENTER";
  const n=add(row,F("Número","HORIZONTAL",{r:99,bg:C.br})); n.resize(28,28); n.primaryAxisSizingMode="FIXED"; n.counterAxisSizingMode="FIXED"; n.primaryAxisAlignItems="CENTER"; n.counterAxisAlignItems="CENTER"; add(n,T(String(i+1),{sz:13,w:"Bold",c:C.bg,lh:16}));
  add(row,T(h,{sz:18,w:"Bold"}),true); add(c,T(d,{sz:15,c:C.mu}),true); });
/* 4 componentes */
const s4=add(root,F("04 Componentes","VERTICAL",{gap:24}),true);
secHead(s4,4,"Textos en los componentes","Patrón y ejemplo para los componentes que más texto llevan.");
const tb=add(s4,F("Tabla","VERTICAL",{r:16,bg:C.card}),true); tb.clipsContent=true;
const hr=add(tb,F("Cabecera","HORIZONTAL",{px:24,py:14,gap:24}),true);
[["Componente",260],["Cómo escribirlo",440],["Ejemplo",480]].forEach(([s,w])=>{ const t=add(hr,T(s,{sz:13,w:"Bold",c:C.mu})); t.resize(w,t.height); t.textAutoResize="HEIGHT"; });
for(const [a,b,c] of D.componentes){ const r=add(tb,F("Fila · "+a,"HORIZONTAL",{px:24,py:16,gap:24}),true); r.strokes=solid(C.line); r.strokeTopWeight=1; r.strokeBottomWeight=0; r.strokeLeftWeight=0; r.strokeRightWeight=0;
  [[a,260,{w:"Bold"}],[b,440,{c:C.mu}],["«"+c+"»",480,{}]].forEach(([s,w,o])=>{ const t=add(r,T(s,Object.assign({sz:16},o))); t.resize(w,t.height); t.textAutoResize="HEIGHT"; }); }
/* 5 glosario */
const s5=add(root,F("05 Glosario","VERTICAL",{gap:24}),true);
secHead(s5,5,"Glosario","Usa siempre la misma palabra para lo mismo.");
const g5=grid(s5,"Términos",4,16);
for(const [u,e] of D.glosario){ const c=cell(g5,"Término · "+u,{gap:6,p:20}); add(c,T(u,{sz:20,w:"Bold"}),true); add(c,T("Evita: "+e,{sz:14,c:C.mu}),true); }
add(root,T(D.fuente,{sz:13,c:C.mu}),true);

const sec=figma.createSection(); sec.name=D.title; page.appendChild(sec);
sec.appendChild(root); root.x=80; root.y=80;
sec.resizeWithoutConstraints(root.width+160,root.height+160); sec.x=X; sec.y=Y;
figma.viewport.scrollAndZoomIntoView([sec]);
return {pageId:page.id,pageName:page.name,sectionId:sec.id,font:FAM,size:[Math.round(sec.width),Math.round(sec.height)],sectionsBefore:secs.length};
