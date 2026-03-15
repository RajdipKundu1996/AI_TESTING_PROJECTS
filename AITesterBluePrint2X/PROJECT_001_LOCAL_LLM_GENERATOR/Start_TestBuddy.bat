@echo off
title Test Buddy - Starting Servers...
echo ==========================================
echo   Test Buddy - AI Test Case Generator
echo ==========================================
echo.
echo Starting Backend Server (port 5000)...
start "TestBuddy Backend" cmd /k "cd /d d:\Testing_Academy_AI\AITesterBluePrint2X\backend && npm run dev"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

echo Starting Frontend Server (port 5173)...
start "TestBuddy Frontend" cmd /k "cd /d d:\Testing_Academy_AI\AITesterBluePrint2X\frontend && npm run dev"

echo Waiting for frontend to start...
timeout /t 8 /nobreak >nul

echo Opening application in browser...
start http://localhost:5173

echo.
echo ==========================================
echo   Test Buddy is running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000
echo ==========================================
echo Close this window after both servers start.
