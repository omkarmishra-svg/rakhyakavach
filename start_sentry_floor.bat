@echo off
echo ============================================================
echo   RAKSHA KAVACH // Real-Time Multi-Camera AI Sentinel
echo   4-Feed Surveillance & PPE Equipment Compliance Engine
echo ============================================================
echo.
echo [1/2] Launching Sentry Floor Backend (FastAPI + YOLOv8 Edge Vision)...
start "Raksha Kavach AI Backend" cmd /c "cd /d %~dp0 && python server.py"

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul

echo [2/2] Launching Sentry Floor Frontend (Vite + React)...
echo.
echo ============================================================
echo   Surveillance Dashboard: http://localhost:3000
echo   AI Inference API:       http://localhost:8000
echo   API Documentation:      http://localhost:8000/docs
echo ============================================================
echo.

cd /d %~dp0frontend
npm run dev
