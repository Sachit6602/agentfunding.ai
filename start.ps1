$root = $PSScriptRoot

Write-Host "Starting all services..." -ForegroundColor Cyan

# Backend (FastAPI on :8000)
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  Set-Location '$root\backend'
  Write-Host 'Backend: activating venv...' -ForegroundColor Yellow
  if (Test-Path '.venv\Scripts\Activate.ps1') { & '.venv\Scripts\Activate.ps1' }
  uvicorn main:app --reload --port 8000
"@

# x402 Data Server (FastAPI on :8001)
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  Set-Location '$root\x402-data-server'
  Write-Host 'x402 Data Server: activating venv...' -ForegroundColor Yellow
  if (Test-Path '..\backend\.venv\Scripts\Activate.ps1') { & '..\backend\.venv\Scripts\Activate.ps1' }
  uvicorn main:app --reload --port 8001
"@

# Frontend (Next.js on :3000)
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  Set-Location '$root\frontend'
  Write-Host 'Frontend: starting Next.js...' -ForegroundColor Yellow
  npm run dev
"@

Write-Host ""
Write-Host "All services launched in separate windows:" -ForegroundColor Green
Write-Host "  Backend API  -> http://localhost:8000" -ForegroundColor White
Write-Host "  Data Server  -> http://localhost:8001" -ForegroundColor White
Write-Host "  Frontend UI  -> http://localhost:3000" -ForegroundColor White
