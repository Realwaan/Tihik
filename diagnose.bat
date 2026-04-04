@echo off
echo ========================================
echo Trackit - Server Diagnostics
echo ========================================
echo.

echo [1/5] Checking environment variables...
if exist .env (
    echo   ✓ .env file exists
    findstr /C:"AUTH_SECRET" .env >nul
    if errorlevel 1 (
        echo   ✗ AUTH_SECRET missing in .env
    ) else (
        echo   ✓ AUTH_SECRET found
    )
    findstr /C:"DATABASE_URL" .env >nul
    if errorlevel 1 (
        echo   ✗ DATABASE_URL missing in .env
    ) else (
        echo   ✓ DATABASE_URL found
    )
) else (
    echo   ✗ .env file not found!
)
echo.

echo [2/5] Checking node_modules...
if exist node_modules (
    echo   ✓ node_modules exists
) else (
    echo   ✗ node_modules not found. Run: npm install
)
echo.

echo [3/5] Checking Prisma client...
if exist node_modules\.prisma\client (
    echo   ✓ Prisma client generated
) else (
    echo   ✗ Prisma client not generated. Run: npm run prisma:generate
)
echo.

echo [4/5] Testing database connection...
echo   Testing PostgreSQL connection...
npm run prisma:generate >nul 2>&1
if errorlevel 1 (
    echo   ⚠ Could not generate Prisma client
) else (
    echo   ✓ Prisma client OK
)
echo.

echo [5/5] Checking Next.js configuration...
if exist next.config.ts (
    echo   ✓ next.config.ts exists
) else (
    echo   ✗ next.config.ts not found
)
echo.

echo ========================================
echo Diagnosis Complete
echo ========================================
echo.
echo Common fixes:
echo   1. Run: npm install
echo   2. Run: npm run prisma:generate
echo   3. Ensure PostgreSQL is running
echo   4. Check DATABASE_URL in .env
echo.
pause
