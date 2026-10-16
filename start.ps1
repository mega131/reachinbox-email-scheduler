Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  ReachInbox Email Scheduler - Starting All Services    " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "[.env] Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

# 2. Check if Redis is running on port 6379
$redisRunning = Get-NetTCPConnection -LocalPort 6379 -ErrorAction SilentlyContinue
if (-not $redisRunning) {
    if (Test-Path "tools\redis\redis-server.exe") {
        Write-Host "[Redis] Starting bundled Redis server on port 6379..." -ForegroundColor Green
        Start-Process -FilePath "tools\redis\redis-server.exe" -ArgumentList "--port 6379 --bind 127.0.0.1" -WindowStyle Hidden
        Start-Sleep -Seconds 2
    } else {
        Write-Host "[Redis] Note: Please ensure Redis is running on port 6379." -ForegroundColor Yellow
    }
} else {
    Write-Host "[Redis] Already active on port 6379." -ForegroundColor Green
}

# 3. Open Web UI in default browser
Write-Host "[Browser] Opening ReachInbox Dashboard at http://localhost:5173..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

# 4. Start all services concurrently
Write-Host "[Services] Launching API, BullMQ Worker, and Frontend..." -ForegroundColor Cyan
npm run dev
