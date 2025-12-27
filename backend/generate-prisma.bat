@echo off
echo ========================================
echo Prisma Client Generation
echo ========================================
echo.
echo Make sure you have:
echo 1. Closed VS Code completely
echo 2. Stopped any running backend servers
echo 3. Closed all terminal windows
echo.
pause
echo.
echo Attempting to generate Prisma client...
echo.

cd /d "%~dp0"
npx prisma generate

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Prisma client generated.
    echo ========================================
    echo.
    echo Next steps:
    echo 1. If you have existing data, run: npx tsx scripts/migrate-workspace-ids.ts
    echo 2. Restart your backend server
    echo.
) else (
    echo.
    echo ========================================
    echo FAILED! File is still locked.
    echo ========================================
    echo.
    echo Try:
    echo 1. Run PowerShell as Administrator
    echo 2. Or restart your computer
    echo 3. Then run this script again
    echo.
)

pause


