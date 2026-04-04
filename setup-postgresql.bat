@echo off
echo ========================================
echo PostgreSQL Service Configuration
echo ========================================
echo.

REM Detect PostgreSQL service
echo Detecting PostgreSQL service...
sc query postgresql-x64-16 >nul 2>&1
if not errorlevel 1 (
    set PG_SERVICE=postgresql-x64-16
    goto :found
)

sc query postgresql-x64-15 >nul 2>&1
if not errorlevel 1 (
    set PG_SERVICE=postgresql-x64-15
    goto :found
)

sc query postgresql-x64-14 >nul 2>&1
if not errorlevel 1 (
    set PG_SERVICE=postgresql-x64-14
    goto :found
)

sc query postgresql-x64-13 >nul 2>&1
if not errorlevel 1 (
    set PG_SERVICE=postgresql-x64-13
    goto :found
)

echo [X] PostgreSQL service not found!
echo.
echo Please check if PostgreSQL is installed.
echo Common installation paths:
echo   C:\Program Files\PostgreSQL\16\
echo   C:\Program Files\PostgreSQL\15\
echo.
pause
exit /b 1

:found
echo [✓] Found service: %PG_SERVICE%
echo.

REM Check current status
sc query %PG_SERVICE% | findstr "RUNNING" >nul
if errorlevel 1 (
    echo Current status: STOPPED
) else (
    echo Current status: RUNNING
)

REM Check startup type
sc qc %PG_SERVICE% | findstr "AUTO_START" >nul
if errorlevel 1 (
    echo Startup type:   MANUAL or DISABLED
    echo.
    echo [!] PostgreSQL is NOT set to start automatically
    echo.
    choice /C YN /M "Would you like to enable automatic startup"
    if errorlevel 2 goto :manual_start
    if errorlevel 1 goto :enable_auto
) else (
    echo Startup type:   AUTOMATIC
    echo.
    echo [✓] PostgreSQL is already set to start automatically!
    goto :check_running
)

:enable_auto
echo.
echo Setting PostgreSQL to start automatically...
sc config %PG_SERVICE% start= auto
if errorlevel 1 (
    echo [X] Failed to configure auto-start
    echo [!] Please run this script as Administrator
    pause
    exit /b 1
) else (
    echo [✓] Auto-start enabled successfully!
)

:check_running
echo.
sc query %PG_SERVICE% | findstr "RUNNING" >nul
if errorlevel 1 (
    choice /C YN /M "PostgreSQL is not running. Start it now"
    if errorlevel 2 goto :done
    if errorlevel 1 goto :start_service
) else (
    echo [✓] PostgreSQL is running
    goto :done
)

:start_service
echo.
echo Starting PostgreSQL...
net start %PG_SERVICE%
if errorlevel 1 (
    echo [X] Failed to start PostgreSQL
    pause
    exit /b 1
) else (
    echo [✓] PostgreSQL started successfully!
)
goto :done

:manual_start
echo.
echo You can start PostgreSQL manually using:
echo   net start %PG_SERVICE%
echo.
echo Or run this script again to configure auto-start.
goto :done

:done
echo.
echo ========================================
echo Configuration Complete
echo ========================================
echo.
echo Service name: %PG_SERVICE%
echo.
echo Useful commands:
echo   Start:   net start %PG_SERVICE%
echo   Stop:    net stop %PG_SERVICE%
echo   Restart: net stop %PG_SERVICE% ^&^& net start %PG_SERVICE%
echo   Status:  sc query %PG_SERVICE%
echo.
pause
