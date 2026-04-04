# Trackit Auto-Start Script
Write-Host "🚀 Starting Trackit Development Environment..." -ForegroundColor Green
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  WARNING: .env file not found!" -ForegroundColor Yellow
    Write-Host "Please create .env file with required environment variables:" -ForegroundColor Yellow
    Write-Host "  - DATABASE_URL" -ForegroundColor Yellow
    Write-Host "  - AUTH_SECRET" -ForegroundColor Yellow
    Write-Host "  - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET" -ForegroundColor Yellow
    Write-Host "  - GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET" -ForegroundColor Yellow
    Write-Host "  - FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit
    }
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    npm install
}

# Check if Prisma client is generated
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Cyan
npm run prisma:generate

# Start the development server in a new window
Write-Host "🌐 Starting Next.js development server..." -ForegroundColor Cyan
Start-Process cmd -ArgumentList "/k", "npm run dev"

# Wait for server to be ready
Write-Host "⏳ Waiting for server to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Test if server is running
$serverReady = $false
$maxAttempts = 10
$attempt = 0

while (-not $serverReady -and $attempt -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2
        $serverReady = $true
    }
    catch {
        $attempt++
        Write-Host "  Waiting... ($attempt/$maxAttempts)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if ($serverReady) {
    Write-Host "✅ Server is ready!" -ForegroundColor Green
    
    # Open sign-in page
    Write-Host "🔐 Opening sign-in page..." -ForegroundColor Cyan
    Start-Process "http://localhost:3000/signin"
    
    Write-Host ""
    Write-Host "✨ Development environment is ready!" -ForegroundColor Green
    Write-Host "   Server: http://localhost:3000" -ForegroundColor White
    Write-Host "   Sign In: http://localhost:3000/signin" -ForegroundColor White
} else {
    Write-Host "❌ Server failed to start. Please check the console for errors." -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
