@echo off
echo ========================================
echo PostgreSQL Installation Helper
echo ========================================
echo.

REM Check if PostgreSQL is already installed
echo Checking for existing PostgreSQL installation...
where psql >nul 2>&1
if not errorlevel 1 (
    echo [✓] PostgreSQL is already installed!
    psql --version
    echo.
    goto :configure
)

echo [!] PostgreSQL not found in PATH
echo.

REM Check common installation directories
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
    echo [✓] Found PostgreSQL 16 at C:\Program Files\PostgreSQL\16\
    set PG_BIN=C:\Program Files\PostgreSQL\16\bin
    goto :add_to_path
)

if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
    echo [✓] Found PostgreSQL 15 at C:\Program Files\PostgreSQL\15\
    set PG_BIN=C:\Program Files\PostgreSQL\15\bin
    goto :add_to_path
)

if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" (
    echo [✓] Found PostgreSQL 14 at C:\Program Files\PostgreSQL\14\
    set PG_BIN=C:\Program Files\PostgreSQL\14\bin
    goto :add_to_path
)

echo [X] PostgreSQL is not installed
echo.
echo ========================================
echo INSTALLATION INSTRUCTIONS
echo ========================================
echo.
echo 1. Download PostgreSQL installer from:
echo    https://www.postgresql.org/download/windows/
echo.
echo 2. Or use the direct link for Windows installer:
echo    https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
echo.
echo 3. Run the installer and:
echo    - Set a password for 'postgres' user (remember this!)
echo    - Use default port: 5432
echo    - Select all components
echo    - Let it start automatically
echo.
echo 4. After installation, run this script again
echo.
echo Would you like to open the download page now?
choice /C YN /M "Open download page"
if errorlevel 2 goto :end
if errorlevel 1 (
    start https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
)
goto :end

:add_to_path
echo.
echo [!] PostgreSQL is installed but not in PATH
echo.
echo To add PostgreSQL to your PATH:
echo 1. Press Win + X, select "System"
echo 2. Click "Advanced system settings"
echo 3. Click "Environment Variables"
echo 4. Under "System variables", find "Path"
echo 5. Click "Edit" and add: %PG_BIN%
echo.
echo Or run this command as Administrator:
echo setx /M PATH "%%PATH%%;%PG_BIN%"
echo.
pause
goto :configure

:configure
echo.
echo ========================================
echo SETUP YOUR DATABASE
echo ========================================
echo.
echo After PostgreSQL is installed, you need to:
echo.
echo 1. Create a database user and database
echo    Run these commands in psql:
echo.
echo    CREATE USER trackit_user WITH PASSWORD 'secure_password_123';
echo    CREATE DATABASE trackit_db OWNER trackit_user;
echo    GRANT ALL PRIVILEGES ON DATABASE trackit_db TO trackit_user;
echo.
echo 2. Run Prisma migrations:
echo    npm run prisma:migrate
echo.
choice /C YN /M "Would you like help running these SQL commands now"
if errorlevel 2 goto :done
if errorlevel 1 goto :run_setup

:run_setup
echo.
echo [*] Connecting to PostgreSQL as postgres user...
echo [!] You will be prompted for the postgres password you set during installation
echo.

REM Create SQL file
echo CREATE USER trackit_user WITH PASSWORD 'secure_password_123'; > setup_db.sql
echo CREATE DATABASE trackit_db OWNER trackit_user; >> setup_db.sql
echo GRANT ALL PRIVILEGES ON DATABASE trackit_db TO trackit_user; >> setup_db.sql
echo \q >> setup_db.sql

echo Running setup script...
psql -U postgres -f setup_db.sql
if errorlevel 1 (
    echo.
    echo [X] Setup failed. Please run these commands manually in psql:
    type setup_db.sql
    pause
    goto :done
)

echo.
echo [✓] Database setup complete!
del setup_db.sql

:done
echo.
echo ========================================
echo Next Steps
echo ========================================
echo.
echo 1. Make sure PostgreSQL service is running:
echo    Run: setup-postgresql.bat
echo.
echo 2. Run Prisma migrations:
echo    npm run prisma:migrate
echo.
echo 3. Start the development server:
echo    npm run dev
echo    or use: start-dev.bat
echo.

:end
pause
