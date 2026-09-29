@echo off
title Village Grievance Full System Launcher
echo ======================================================================
echo Launching All 3 Services: AI + Backend + Mobile App
echo ======================================================================

echo [1/3] Starting Python AI Microservice (Port 5000)...
start "AI Microservice (Port 5000)" cmd /k "cd /d "%~dp0\ai" && python app.py"

echo [2/3] Starting Spring Boot Backend (Port 8080)...
start "Spring Boot Backend (Port 8080)" cmd /k "cd /d "%~dp0\backend" && .\mvnw.cmd spring-boot:run"

echo [3/3] Starting Expo Mobile / Web App (Port 8081)...
start "Expo Mobile App (Port 8081)" cmd /k "cd /d "%~dp0\mobile-app" && npx expo start"

echo ======================================================================
echo All services launched in their respective windows!
echo - AI Service: http://127.0.0.1:5000
echo - Backend API: http://localhost:8080
echo - Mobile/Web: http://localhost:8081
echo ======================================================================
pause
