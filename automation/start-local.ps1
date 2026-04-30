# ============================================================
# start-local.ps1 — One-click Hardhat local dev environment
# Usage: powershell -ExecutionPolicy Bypass -File .\start-local.ps1
# ============================================================

$contractsDir = Join-Path (Resolve-Path "$PSScriptRoot\..").Path "contracts"
$webDir       = Join-Path (Resolve-Path "$PSScriptRoot\..").Path "web"
$envFile      = Join-Path $webDir ".env.local"

$FACTORY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
$MARKETPLACE_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  TicketNFT - Local Dev Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Kill any existing process on port 8545 ---
Write-Host "[1/5] Checking port 8545..." -ForegroundColor Yellow
$conns = Get-NetTCPConnection -LocalPort 8545 -ErrorAction SilentlyContinue
if ($conns) {
    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($p in $pids) {
        Write-Host "  Stopping process $p on port 8545" -ForegroundColor DarkYellow
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}
Write-Host "  Port 8545 free." -ForegroundColor Green

# --- 2. Start Hardhat node ---
Write-Host "[2/5] Starting Hardhat node..." -ForegroundColor Yellow
$nodeProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c","cd /d `"$contractsDir`" && npx hardhat node" `
    -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 3

# Wait for node
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
    try {
        $body = '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8545" -Method POST -ContentType "application/json" -Body $body -ErrorAction Stop
        if ($resp.result) { $ready = $true; break }
    } catch { }
    Write-Host "  Waiting..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 1
}

if (-not $ready) {
    Write-Host "  ERROR: Hardhat node failed!" -ForegroundColor Red
    if ($nodeProcess) { Stop-Process -Id $nodeProcess.Id -Force -ErrorAction SilentlyContinue }
    exit 1
}
Write-Host "  Node running at http://127.0.0.1:8545" -ForegroundColor Green

# --- 3. Deploy EventFactory ---
Write-Host "[3/5] Deploying EventFactory..." -ForegroundColor Yellow
Push-Location $contractsDir
$deployOut = & npx hardhat run scripts/deploy.ts --network localhost 2>&1 | Out-String
Pop-Location

if ($deployOut -match "EventFactory deployed to: (0x[a-fA-F0-9]{40})") {
    $FACTORY_ADDRESS = $Matches[1]
    Write-Host "  Factory: $FACTORY_ADDRESS" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Deploy failed (Factory)!" -ForegroundColor Red
    Write-Host $deployOut
    if ($nodeProcess) { Stop-Process -Id $nodeProcess.Id -Force -ErrorAction SilentlyContinue }
    exit 1
}

if ($deployOut -match "TicketMarketplace deployed to: (0x[a-fA-F0-9]{40})") {
    $MARKETPLACE_ADDRESS = $Matches[1]
    Write-Host "  Marketplace: $MARKETPLACE_ADDRESS" -ForegroundColor Green

} else {
    Write-Host "  ERROR: Deploy failed!" -ForegroundColor Red
    Write-Host $deployOut
    if ($nodeProcess) { Stop-Process -Id $nodeProcess.Id -Force -ErrorAction SilentlyContinue }
    exit 1
}

# --- 4. Fund organizer wallet ---
Write-Host "[4/5] Funding organizer wallet..." -ForegroundColor Yellow
Push-Location $contractsDir
$fundOut = & npx hardhat run scripts/fund-local.ts --network localhost 2>&1 | Out-String
Pop-Location

if ($fundOut -match "Sent 100 ETH") {
    Write-Host "  100 ETH sent to Organizer." -ForegroundColor Green
} else {
    Write-Host "  WARNING: Fund script output:" -ForegroundColor DarkYellow
    Write-Host $fundOut
}

# --- 5. Update .env.local ---
Write-Host "[5/5] Updating .env.local..." -ForegroundColor Yellow
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    $content = $content -replace '(?m)^NEXT_PUBLIC_EVENT_FACTORY_ADDRESS=.*$', "NEXT_PUBLIC_EVENT_FACTORY_ADDRESS=$FACTORY_ADDRESS"
    if ($content -match '(?m)^NEXT_PUBLIC_MARKETPLACE_ADDRESS=.*$') {
        $content = $content -replace '(?m)^NEXT_PUBLIC_MARKETPLACE_ADDRESS=.*$', "NEXT_PUBLIC_MARKETPLACE_ADDRESS=$MARKETPLACE_ADDRESS"
    } else {
        $content += "`nNEXT_PUBLIC_MARKETPLACE_ADDRESS=$MARKETPLACE_ADDRESS"
    }
    Set-Content $envFile -Value $content -NoNewline
    Write-Host "  Updated factory and marketplace addresses." -ForegroundColor Green
}

# --- 6. Clear Database ---
Write-Host "[6/6] Clearing old database records..." -ForegroundColor Yellow
Push-Location $webDir
$clearOut = & node clear-events.js 2>&1 | Out-String
Pop-Location
if ($clearOut -match "Deleted") {
    Write-Host "  $($clearOut.Trim())" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Could not clear DB (ignore if first run):" -ForegroundColor DarkYellow
    Write-Host $clearOut
}

# --- Done ---
Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  All set! Hardhat node is running." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Factory:  $FACTORY_ADDRESS"
Write-Host "  Market:   $MARKETPLACE_ADDRESS"
Write-Host "  Node:     http://127.0.0.1:8545"
Write-Host "  Chain ID: 31337"
Write-Host ""
Write-Host "  Next:" -ForegroundColor Cyan
Write-Host "    1. MetaMask -> Hardhat network"
Write-Host "    2. cd web && npm run dev"
Write-Host "    3. Open http://localhost:3000"
Write-Host ""
Write-Host "  To stop: taskkill /F /PID $($nodeProcess.Id)" -ForegroundColor DarkGray
Write-Host ""
