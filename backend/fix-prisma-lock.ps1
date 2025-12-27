# PowerShell script to fix Prisma file lock issue

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Prisma File Lock Fixer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if file exists and try to delete it
$prismaFile = "node_modules\.prisma\client\query_engine-windows.dll.node"
$prismaDir = "node_modules\.prisma"

if (Test-Path $prismaFile) {
    Write-Host "Found locked Prisma file. Attempting to remove..." -ForegroundColor Yellow
    
    # Try to remove the file
    try {
        Remove-Item -Path $prismaFile -Force -ErrorAction Stop
        Write-Host "✓ Successfully removed locked file" -ForegroundColor Green
    } catch {
        Write-Host "✗ Could not remove file: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "The file is locked by another process." -ForegroundColor Yellow
        Write-Host "Please:" -ForegroundColor Yellow
        Write-Host "  1. Close VS Code completely" -ForegroundColor White
        Write-Host "  2. Stop any running backend servers" -ForegroundColor White
        Write-Host "  3. Close all terminal windows" -ForegroundColor White
        Write-Host "  4. Wait 10 seconds" -ForegroundColor White
        Write-Host "  5. Run this script again" -ForegroundColor White
        Write-Host ""
        exit 1
    }
}

# Try to remove entire .prisma folder if it exists
if (Test-Path $prismaDir) {
    Write-Host "Removing .prisma folder..." -ForegroundColor Yellow
    try {
        Remove-Item -Path $prismaDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Removed .prisma folder" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not fully remove .prisma folder (this is okay)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Attempting to generate Prisma client..." -ForegroundColor Cyan
Write-Host ""

# Try prisma generate
$result = & npx prisma generate 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SUCCESS! Prisma client generated." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. If you have existing data, run: npx tsx scripts/migrate-workspace-ids.ts" -ForegroundColor White
    Write-Host "  2. Restart your backend server" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "FAILED! Still locked." -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try using 'prisma db push' instead:" -ForegroundColor Yellow
    Write-Host "  npx prisma db push" -ForegroundColor White
    Write-Host ""
    Write-Host "Or:" -ForegroundColor Yellow
    Write-Host "  1. Close VS Code completely" -ForegroundColor White
    Write-Host "  2. Stop all Node processes" -ForegroundColor White
    Write-Host "  3. Restart your computer" -ForegroundColor White
    Write-Host "  4. Then run: npx prisma generate" -ForegroundColor White
    Write-Host ""
}

