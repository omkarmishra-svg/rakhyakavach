@echo off
echo ============================================================
echo   RAKSHA KAVACH // Real-Time AI Safety Sentinel Floor
echo   Single Streamed Camera with Side Rail Camera Switcher
echo   Square Alert Verification (Green/Yellow/Red) + Audit Logs
echo ============================================================
echo.
echo [1/2] Launching AI Sentinel Backend (FastAPI + YOLOv8 Edge Vision)...
start "Raksha Kavach AI Backend" cmd /c "cd /d %~dp0 && python server.py"

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul

echo [2/2] Launching Modern Sentinel Frontend (Vite + React)...
echo.
echo ============================================================
echo   Surveillance Dashboard: http://localhost:3000
echo   AI Inference API:       http://localhost:8000
echo   API Documentation:      http://localhost:8000/docs
echo ============================================================
echo.

cd /d %~dp0frontend
npm run dev
