@echo off
echo ============================================================
echo   RAKSHA KAVACH // 24/7 Live Public Deployment (No Sleeping)
echo   FastAPI + YOLOv8 + React UI + Cloudflare Live Tunnel
echo ============================================================
echo.

echo [1/2] Starting AI Sentinel Server on port 8000...
start "Raksha Kavach Server" /min python server.py

timeout /t 4 /nobreak >nul

echo [2/2] Launching 24/7 Cloudflare Live Tunnel...
start "Raksha Kavach Cloudflare Tunnel" .\cloudflared.exe tunnel --url http://localhost:8000

echo.
echo ============================================================
echo   Local Dashboard:   http://localhost:8000
echo   Health Check:      http://localhost:8000/api/health
echo ============================================================
echo.
