# Chrome Extension Cache Fix Script for Windows (PowerShell)
# This script helps completely clear Chrome extension cache

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Chrome Extension Cache Clear Script" -ForegroundColor Cyan
Write-Host "For Windows (PowerShell)" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if Chrome is running
Write-Host "Step 1: Checking for running Chrome processes..." -ForegroundColor Yellow
Write-Host ""

$chromeProcesses = Get-Process chrome -ErrorAction SilentlyContinue

if ($chromeProcesses) {
    Write-Host "WARNING: Chrome is currently running!" -ForegroundColor Red
    Write-Host "Found $($chromeProcesses.Count) Chrome process(es)" -ForegroundColor Red
    Write-Host ""

    $closeChrome = Read-Host "Do you want to close Chrome automatically? (Y/N)"

    if ($closeChrome -eq "Y" -or $closeChrome -eq "y") {
        Write-Host "Closing Chrome..." -ForegroundColor Yellow
        Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "Chrome closed successfully" -ForegroundColor Green
    } else {
        Write-Host "Please close ALL Chrome windows before continuing." -ForegroundColor Yellow
        Write-Host "Press any key after closing Chrome..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
}

# Step 2: Locate Chrome cache directories
Write-Host ""
Write-Host "Step 2: Locating Chrome cache directories..." -ForegroundColor Yellow
Write-Host ""

$chromeData = "$env:LOCALAPPDATA\Google\Chrome\User Data"

if (Test-Path $chromeData) {
    Write-Host "Found Chrome User Data: $chromeData" -ForegroundColor Green
    Write-Host ""

    # Check what exists
    $serviceWorker = Join-Path $chromeData "Default\Service Worker"
    $cache = Join-Path $chromeData "Default\Cache"
    $codeCache = Join-Path $chromeData "Default\Code Cache"
    $gpuCache = Join-Path $chromeData "Default\GPUCache"

    Write-Host "Checking cache folders..." -ForegroundColor Cyan

    if (Test-Path $serviceWorker) {
        $swSize = (Get-ChildItem $serviceWorker -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "[FOUND] Service Worker cache ($([math]::Round($swSize, 2)) MB)" -ForegroundColor Yellow
    }

    if (Test-Path $cache) {
        $cacheSize = (Get-ChildItem $cache -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "[FOUND] Cache folder ($([math]::Round($cacheSize, 2)) MB)" -ForegroundColor Yellow
    }

    if (Test-Path $codeCache) {
        $ccSize = (Get-ChildItem $codeCache -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "[FOUND] Code Cache folder ($([math]::Round($ccSize, 2)) MB)" -ForegroundColor Yellow
    }

    if (Test-Path $gpuCache) {
        Write-Host "[FOUND] GPU Cache folder" -ForegroundColor Yellow
    }

    Write-Host ""
    $removeSW = Read-Host "Do you want to remove the Service Worker cache? (Y/N)"

    if ($removeSW -eq "Y" -or $removeSW -eq "y") {
        Write-Host "Removing Service Worker cache..." -ForegroundColor Yellow
        Remove-Item -Path $serviceWorker -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Done: Service Worker cache removed" -ForegroundColor Green
    }

    Write-Host ""
    $removeCache = Read-Host "Do you want to clear all Cache folders? (Y/N)"

    if ($removeCache -eq "Y" -or $removeCache -eq "y") {
        Write-Host "Removing Cache folders..." -ForegroundColor Yellow

        Remove-Item -Path $cache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed: Cache" -ForegroundColor Green

        Remove-Item -Path $codeCache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed: Code Cache" -ForegroundColor Green

        Remove-Item -Path $gpuCache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed: GPU Cache" -ForegroundColor Green

        Write-Host "Done: All cache folders removed" -ForegroundColor Green
    }

    # Optional: Clear extension-specific cache
    Write-Host ""
    $clearExtensions = Read-Host "Do you want to see and remove specific extension caches? (Y/N)"

    if ($clearExtensions -eq "Y" -or $clearExtensions -eq "y") {
        $extensionsPath = Join-Path $chromeData "Default\Extensions"

        if (Test-Path $extensionsPath) {
            Write-Host ""
            Write-Host "Extension folders found:" -ForegroundColor Cyan

            $extensions = Get-ChildItem $extensionsPath -Directory
            $index = 1

            foreach ($ext in $extensions) {
                $versions = Get-ChildItem $ext.FullName -Directory
                foreach ($ver in $versions) {
                    $manifestPath = Join-Path $ver.FullName "manifest.json"
                    if (Test-Path $manifestPath) {
                        $manifest = Get-Content $manifestPath | ConvertFrom-Json
                        Write-Host "  [$index] $($manifest.name) - v$($manifest.version)" -ForegroundColor Yellow
                        Write-Host "      ID: $($ext.Name)" -ForegroundColor Gray
                        $index++
                    }
                }
            }

            Write-Host ""
            Write-Host "Note: Removing extensions here will uninstall them completely." -ForegroundColor Red
            Write-Host "It's better to just reload them in chrome://extensions/" -ForegroundColor Yellow
        }
    }

} else {
    Write-Host "ERROR: Chrome User Data directory not found at: $chromeData" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure Chrome is installed and has been run at least once." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Cache clearing complete!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start Chrome" -ForegroundColor White
Write-Host "2. Go to chrome://extensions/" -ForegroundColor White
Write-Host "3. Enable Developer mode" -ForegroundColor White
Write-Host "4. Click 'Load unpacked'" -ForegroundColor White
Write-Host "5. Select the extension folder" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
