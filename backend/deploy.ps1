# AppWhistler Deployment Script for Windows PowerShell
# Run with: .\deploy.ps1

Write-Host "🎺 AppWhistler Deployment Script (Windows)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if flyctl is installed
$flyctlExists = Get-Command flyctl -ErrorAction SilentlyContinue
if (-not $flyctlExists) {
    Write-Host "❌ Fly CLI not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installing Fly CLI..." -ForegroundColor Yellow

    # Install Fly CLI for Windows
    iwr https://fly.io/install.ps1 -useb | iex

    Write-Host ""
    Write-Host "✓ Fly CLI installed" -ForegroundColor Green
    Write-Host "Please close and reopen PowerShell, then run this script again" -ForegroundColor Yellow
    exit
}

Write-Host "✓ Fly CLI installed" -ForegroundColor Green

# Check if logged in
$authStatus = flyctl auth whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "→ Logging in to Fly.io..." -ForegroundColor Yellow
    flyctl auth login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Login failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✓ Logged in to Fly.io" -ForegroundColor Green

# Generate secrets if not exists
if (-not (Test-Path ".env.production")) {
    Write-Host "→ Generating production secrets..." -ForegroundColor Yellow

    # Generate random secrets (PowerShell equivalent of openssl rand)
    function New-RandomHex {
        param([int]$Length = 32)
        $bytes = New-Object byte[] $Length
        [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
        return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ''
    }

    $jwtSecret = New-RandomHex -Length 32
    $refreshSecret = New-RandomHex -Length 32

    @"
JWT_SECRET=$jwtSecret
REFRESH_TOKEN_SECRET=$refreshSecret
NODE_ENV=production
ALLOWED_ORIGINS=https://twitter.com,https://x.com,chrome-extension://,https://appwhistler.org
"@ | Out-File -FilePath ".env.production" -Encoding ASCII

    Write-Host "✓ Secrets generated" -ForegroundColor Green
}

# Check if app exists
$appExists = flyctl apps list 2>&1 | Select-String "appwhistler-api"

if (-not $appExists) {
    Write-Host "→ Creating new Fly app..." -ForegroundColor Yellow
    flyctl launch --no-deploy --name appwhistler-api --region ord --org personal

    Write-Host "→ Creating PostgreSQL database..." -ForegroundColor Yellow
    flyctl postgres create --name appwhistler-db --region ord --vm-size shared-cpu-1x --volume-size 1
    flyctl postgres attach appwhistler-db --app appwhistler-api

    Write-Host "✓ App and database created" -ForegroundColor Green
} else {
    Write-Host "✓ App already exists" -ForegroundColor Green
}

# Load secrets from .env.production
$envContent = Get-Content ".env.production"
$jwtSecret = ($envContent | Select-String "JWT_SECRET=(.+)").Matches.Groups[1].Value
$refreshSecret = ($envContent | Select-String "REFRESH_TOKEN_SECRET=(.+)").Matches.Groups[1].Value

# Set secrets
Write-Host "→ Setting secrets..." -ForegroundColor Yellow
flyctl secrets set `
  "JWT_SECRET=$jwtSecret" `
  "REFRESH_TOKEN_SECRET=$refreshSecret" `
  "NODE_ENV=production" `
  "ALLOWED_ORIGINS=https://twitter.com,https://x.com,chrome-extension://,https://appwhistler.org" `
  --app appwhistler-api

Write-Host "✓ Secrets set" -ForegroundColor Green

# Deploy
Write-Host "→ Deploying to Fly.io..." -ForegroundColor Yellow
flyctl deploy --app appwhistler-api

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Deployed!" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

# Get URL
$appInfo = flyctl info --app appwhistler-api
$url = ($appInfo | Select-String "Hostname\s+(\S+)").Matches.Groups[1].Value

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "🎺 DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your API is live at:" -ForegroundColor White
Write-Host "https://$url" -ForegroundColor Green
Write-Host ""
Write-Host "Health check:" -ForegroundColor White
Write-Host "  curl https://$url/health" -ForegroundColor Gray
Write-Host ""
Write-Host "GraphQL endpoint:" -ForegroundColor White
Write-Host "  https://$url/graphql" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Initialize database schema" -ForegroundColor White
Write-Host "  2. Update extension API URL to: https://$url/graphql" -ForegroundColor White
Write-Host "  3. Test the extension" -ForegroundColor White
Write-Host "  4. Submit to Chrome Web Store" -ForegroundColor White
Write-Host ""
Write-Host "Initialize database with:" -ForegroundColor Yellow
Write-Host "  flyctl postgres connect -a appwhistler-db" -ForegroundColor Gray
Write-Host "  Then paste schema from database/schema.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Ready to ship!" -ForegroundColor Green
