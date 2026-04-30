param (
    [Parameter(Mandatory=$true)]
    [string]$WalletAddress
)

$contractsDir = Join-Path (Resolve-Path "$PSScriptRoot\..").Path "contracts"

Write-Host "Đang nạp 100 ETH vào ví: $WalletAddress..." -ForegroundColor Yellow

$env:FUND_ADDRESS = $WalletAddress

Push-Location $contractsDir
& npx hardhat run scripts/fund-wallet.ts --network localhost
Pop-Location
