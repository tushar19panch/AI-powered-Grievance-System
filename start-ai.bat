@echo off
title Village Grievance AI Microservice
echo ========================================================
echo Starting AI Microservice (Port 5000)...
echo Category Classification, Priority, Image & Whisper Voice
echo ========================================================
cd /d "%~dp0\ai"
python app.py
pause
