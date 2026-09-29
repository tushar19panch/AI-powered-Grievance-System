@echo off
title VillageApp - Phone Screen Mirror (scrcpy)
echo ====================================================
echo    VillageApp - Mobile Screen on Laptop (scrcpy)
echo ====================================================
echo.
echo 1. Make sure your Android Phone is connected via USB.
echo 2. Make sure USB Debugging is ON in Developer Options.
echo.

set ADB_EXE=C:\Users\pc\AppData\Local\Android\Sdk\platform-tools\adb.exe
if not exist "%ADB_EXE%" set ADB_EXE=adb

echo Enabling USB reverse port forwarding for Backend (8080) and Metro (8081)...
"%ADB_EXE%" reverse tcp:8080 tcp:8080 >nul 2>&1
"%ADB_EXE%" reverse tcp:8081 tcp:8081 >nul 2>&1

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
