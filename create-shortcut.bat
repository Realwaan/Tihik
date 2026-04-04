@echo off
echo Creating desktop shortcut for Trackit...

set SCRIPT_DIR=%~dp0
set DESKTOP=%USERPROFILE%\Desktop
set SHORTCUT=%DESKTOP%\Trackit Dev.lnk

powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT%'); $Shortcut.TargetPath = '%SCRIPT_DIR%start-dev.bat'; $Shortcut.WorkingDirectory = '%SCRIPT_DIR%'; $Shortcut.Description = 'Start Trackit Development Environment'; $Shortcut.Save()"

if exist "%SHORTCUT%" (
    echo ✓ Shortcut created on desktop: "Trackit Dev.lnk"
    echo.
    echo You can now double-click the shortcut to start the development environment!
) else (
    echo ✗ Failed to create shortcut
)

pause
