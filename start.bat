@echo off
cd /d "J:\Save Edutor"
if not exist logs mkdir logs
echo Starting Python API server...
start /min "" "C:\Users\mayn\AppData\Local\Programs\Python\Python311\python.exe" -m uvicorn server.remover_api:app --host 127.0.0.1 --port 5178 --log-level warning
timeout /t 3 /nobreak >nul
echo Starting Vite dev server...
start /min "" cmd /c "npx vite --host"
timeout /t 4 /nobreak >nul
start http://localhost:5173
echo.
echo WatermarkForge is running.
echo Close this window to exit.
echo.
:loop
timeout /t 10 /nobreak >nul
tasklist /fi "IMAGENAME eq python.exe" 2>nul | find /i "python.exe" >nul || goto cleanup
tasklist /fi "IMAGENAME eq node.exe" 2>nul | find /i "node.exe" >nul || goto cleanup
goto loop
:cleanup
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
echo Services stopped.
pause
