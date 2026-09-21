@echo off
echo ============================================================
echo   SENTRY FLOOR // Raksha Kavach Control Room Dashboard
echo   Starting backend + frontend servers...
echo ============================================================

:: Start FastAPI backend in background
start "Sentry Floor Backend" cmd /c "cd /d %~dp0 && python server.py"

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Vite frontend dev server
cd /d %~dp0frontend
echo.
echo   Frontend starting at http://localhost:3000
echo   Backend running at http://localhost:8000
echo.
npm run dev
