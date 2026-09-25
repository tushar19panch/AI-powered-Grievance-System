@echo off
title VillageApp - Web Simulator on Laptop
echo ====================================================
echo    VillageApp - Mobile Simulator on Laptop Screen
echo ====================================================
echo.
echo Opening Mobile Simulator in your browser...
cd /d "%~dp0mobile-app"
npx expo start --web
