@echo off
echo Starting Marine Data Platform...
echo.

start "Backend (Port 3001)" cmd /k "cd /d %~dp0backend && node ..\node_modules\tsx\dist\cli.mjs src/app.ts"

timeout /t 3 /nobreak >nul

start "Frontend (Port 3000)" cmd /k "cd /d %~dp0frontend && node ..\node_modules\next\dist\bin\next dev -p 3000"

echo.
echo ========================================
echo Marine Data Platform Started!
echo ========================================
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo Press any key to exit...
pause >nul
