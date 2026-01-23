@echo off
REM Chrome Extension Cache Fix Script for Windows
REM This script helps completely clear Chrome extension cache

echo ===================================
echo Chrome Extension Cache Clear Script
echo For Windows
echo ===================================
echo.

REM Step 1: Check if Chrome is running
echo Step 1: Checking for running Chrome processes...
echo.

tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I /N "chrome.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo WARNING: Chrome is currently running!
    echo Please close ALL Chrome windows before continuing.
    echo.
    echo Press any key after closing Chrome, or Ctrl+C to cancel...
    pause >nul
)

REM Step 2: Locate Chrome cache directories
echo.
echo Step 2: Locating Chrome cache directories...
echo.

set CHROME_DATA=%LOCALAPPDATA%\Google\Chrome\User Data

if exist "%CHROME_DATA%" (
    echo Found Chrome User Data: %CHROME_DATA%
    echo.

    REM Check what exists
    if exist "%CHROME_DATA%\Default\Service Worker" (
        echo [FOUND] Service Worker cache
    )
    if exist "%CHROME_DATA%\Default\Cache" (
        echo [FOUND] Cache folder
    )
    if exist "%CHROME_DATA%\Default\Code Cache" (
        echo [FOUND] Code Cache folder
    )

    echo.
    echo Do you want to remove the Service Worker cache? (Y/N)
    set /p REMOVE_SW=

    if /i "%REMOVE_SW%"=="Y" (
        echo Removing Service Worker cache...
        rd /s /q "%CHROME_DATA%\Default\Service Worker" 2>nul
        echo Done: Service Worker cache removed
    )

    echo.
    echo Do you want to clear the Cache folders? (Y/N)
    set /p REMOVE_CACHE=

    if /i "%REMOVE_CACHE%"=="Y" (
        echo Removing Cache folders...
        rd /s /q "%CHROME_DATA%\Default\Cache" 2>nul
        rd /s /q "%CHROME_DATA%\Default\Code Cache" 2>nul
        rd /s /q "%CHROME_DATA%\Default\GPUCache" 2>nul
        echo Done: Cache folders removed
    )

) else (
    echo ERROR: Chrome User Data directory not found at: %CHROME_DATA%
    echo.
    echo Make sure Chrome is installed and has been run at least once.
)

echo.
echo ===================================
echo Cache clearing complete!
echo ===================================
echo.
echo Next steps:
echo 1. Start Chrome
echo 2. Go to chrome://extensions/
echo 3. Enable Developer mode
echo 4. Click 'Load unpacked'
echo 5. Select the extension folder
echo.
echo Press any key to exit...
pause >nul
