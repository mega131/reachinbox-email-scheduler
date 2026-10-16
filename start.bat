@echo off
title ReachInbox Email Scheduler - All Services
echo ========================================================
echo   ReachInbox Email Scheduler - Starting All Services
echo ========================================================
echo.

REM 1. Copy .env if not exists
if not exist .env (
    echo [.env] Creating .env from .env.example...
    copy .env.example .env
)

REM 2. Check if Redis is running on port 6379
netstat -ano | findstr :6379 >nul
if %errorlevel% neq 0 (
    echo [Redis] Starting bundled Redis server on port 6379...
    start "ReachInbox Redis" /MIN "tools\redis\redis-server.exe" --port 6379 --bind 127.0.0.1
    timeout /t 2 /nobreak >nul
) else (
    echo [Redis] Already active on port 6379.
)

REM 3. Open Web UI in browser
echo [Browser] Opening ReachInbox Dashboard...
start http://localhost:5173

REM 4. Start API, Worker, and Web frontend concurrently
echo [Services] Starting API (Port 4000), Worker, and Frontend (Port 5173)...
npm run dev
