@echo off
title VillageApp - Phone Screen Mirror (scrcpy)
echo ====================================================
echo    VillageApp - Mobile Screen on Laptop (scrcpy)
echo ====================================================
echo.
echo 1. Make sure your Android Phone is connected via USB.
echo 2. Make sure USB Debugging is ON in Developer Options.
echo.

set SCRCPY_DIR=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Genymobile.scrcpy_Microsoft.Winget.Source_8wekyb3d8bbwe\scrcpy-win64-v4.1

if exist "%SCRCPY_DIR%\scrcpy.exe" (
    cd /d "%SCRCPY_DIR%"
    echo Launching scrcpy...
    scrcpy.exe --always-on-top --window-title="VillageApp Phone"
) else (
    echo Searching for scrcpy on your system...
    scrcpy --always-on-top --window-title="VillageApp Phone"
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ----------------------------------------------------
    echo [NOTE] If no device was found:
    echo 1. Connect phone via USB cable.
    echo 2. On your phone, tap "Allow USB Debugging" popup.
    echo 3. Run this file again!
    echo ----------------------------------------------------
    pause
)
