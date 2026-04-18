@echo off
echo ========================================
echo Starting Trackit Development Environment
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo [X] WARNING: .env file not found!
    echo Please create .env file with required environment variables.
    echo.
    pause
    exit /b 1
)

REM Check PostgreSQL Service
echo [1/5] Checking PostgreSQL service...
sc query postgresql-x64-16 >nul 2>&1
if errorlevel 1 (
    echo   Checking alternative service name...
    sc query postgresql-x64-15 >nul 2>&1
    if errorlevel 1 (
        sc query postgresql-x64-14 >nul 2>&1
        if errorlevel 1 (
            echo   [!] PostgreSQL service not found
            echo   Please check your PostgreSQL installation
            echo.
            echo   Common service names:
            echo   - postgresql-x64-16
            echo   - postgresql-x64-15
            echo   - postgresql-x64-14
            echo.
            set SKIP_PG_CHECK=1
        ) else (
            set PG_SERVICE=postgresql-x64-14
        )
    ) else (
        set PG_SERVICE=postgresql-x64-15
    )
) else (
    set PG_SERVICE=postgresql-x64-16
)

if not defined SKIP_PG_CHECK (
    echo   [✓] Found PostgreSQL service: %PG_SERVICE%
    
    REM Check if PostgreSQL is running
    sc query %PG_SERVICE% | findstr "RUNNING" >nul
    if errorlevel 1 (
        echo   [-] PostgreSQL is not running
        echo   [*] Starting PostgreSQL...
        net start %PG_SERVICE%
        if errorlevel 1 (
            echo   [X] Failed to start PostgreSQL
            echo   [!] You may need to run this script as Administrator
            pause
            exit /b 1
        ) else (
            echo   [✓] PostgreSQL started successfully
        )
    ) else (
        echo   [✓] PostgreSQL is already running
    )
)
echo.

REM Install dependencies if needed
echo [2/5] Checking dependencies...
if not exist node_modules (
    echo   [*] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo   [X] Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo   [✓] Dependencies installed
)
echo.

REM Generate Prisma client
echo [3/5] Generating Prisma client...
call npm run prisma:generate
if errorlevel 1 (
    echo   [X] Failed to generate Prisma client
    pause
    exit /b 1
) else (
    echo   [✓] Prisma client ready
)
echo.

REM Start the Next.js development server
echo [4/5] Starting Next.js server...
start "Trackit Dev Server" cmd /k "npm run dev"
echo   [✓] Server starting in new window...
echo.

REM Wait for server to start
echo [5/5] Waiting for server to start...
timeout /t 5 /nobreak >nul

REM Open sign-in page in default browser
echo   [*] Opening sign-in page...
start http://localhost:3000/signin

echo.
echo ========================================
echo [✓] Development environment started!
echo ========================================
echo   Server:  http://localhost:3000
echo   Sign In: http://localhost:3000/signin
echo ========================================
echo.
