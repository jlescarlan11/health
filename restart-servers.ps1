# PowerShell script to restart both backend and Expo servers with cache cleared

Write-Host "Stopping any running Node processes on ports 3000 and 19000..." -ForegroundColor Yellow

# Kill processes on port 3000 (backend)
$backendProcess = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($backendProcess) {
    Stop-Process -Id $backendProcess -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped backend server" -ForegroundColor Green
}

# Kill Expo processes (common ports)
$expoProcesses = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*expo*" }
if ($expoProcesses) {
    $expoProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped Expo server" -ForegroundColor Green
}

Start-Sleep -Seconds 2

Write-Host "`nStarting backend server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "Starting Expo server with cleared cache..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot; npx expo start --clear" -WindowStyle Normal

Write-Host "`n✓ Both servers are starting in separate windows" -ForegroundColor Green
Write-Host "`nNote: Make sure your local IP is correct in app.config.js" -ForegroundColor Yellow
Write-Host "Run 'node get-local-ip.js' to get your current IP address" -ForegroundColor Yellow


