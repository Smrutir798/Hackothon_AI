@echo off
echo ===================================================
echo       AI Cooking Assistant - One-Click Start
echo ===================================================

echo [1/2] Starting Backend Server (Python)...
start "AI Cooking Backend" cmd /k "cd backend && python main.py"

echo [2/2] Starting Frontend (React/Vite)...
start "AI Cooking Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo Success! Both servers are launching in new windows.
echo - Backend: http://localhost:8002
echo - Frontend: http://localhost:5173
echo.
pause

