# Unified Tools App - Startup Script
# Starts both backend and frontend servers

$ErrorActionPreference = "Stop"

Write-Host "Starting Unified Tools App..." -ForegroundColor Cyan

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start backend in a new PowerShell window
$backendPath = Join-Path $scriptDir "backend"
$venvActivate = Join-Path $scriptDir "venv\Scripts\Activate.ps1"

Write-Host "Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$venvActivate'; cd '$backendPath'; python main.py"

# Give backend a moment to start
Start-Sleep -Seconds 2

# Start frontend in a new PowerShell window  
$frontendPath = Join-Path $scriptDir "frontend"

Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev"

Write-Host ""
Write-Host "Both servers are starting!" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Open http://localhost:3000 in your browser" -ForegroundColor Cyan
