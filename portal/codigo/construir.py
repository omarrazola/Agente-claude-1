# Junta el código del portal con el dibujante de Figma y genera portal.html
# Uso: python3 construir.py   (desde esta carpeta)
import pathlib
aqui = pathlib.Path(__file__).parent
src = (aqui / "app_src.html").read_text(encoding="utf-8")
fig = (aqui / "figma_renderer.min.js").read_text(encoding="utf-8")
assert src.count("/*__RENDERER__*/") == 1
(aqui.parent / "portal.html").write_text(src.replace("/*__RENDERER__*/", fig), encoding="utf-8")
print("portal.html actualizado")
