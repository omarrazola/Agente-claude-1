@echo off
echo ========================================================
echo  Iniciando Tunel HTTPS temporal con Cloudflare
echo  Apuntando al portal en http://localhost:5173
echo ========================================================
echo.
"%~dp0bin\cloudflared.exe" tunnel --url http://127.0.0.1:5173
pause
