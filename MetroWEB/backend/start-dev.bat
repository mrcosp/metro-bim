@echo off
REM Start server in a new window and run test script in another window
REM Kill existing node processes (dev convenience)
echo Stopping any existing node processes...
taskkill /IM node.exe /F >nul 2>&1
timeout /t 1 /nobreak >nul

echo Starting server window...
start "MetroWEB Server" cmd /k "cd /d %~dp0 && node server.js"

REM give server a short time to start before running tests
timeout /t 2 /nobreak >nul

echo Starting test window...
start "MetroWEB Test" powershell -NoExit -ExecutionPolicy Bypass -Command "cd '%~dp0' ; .\test-admin.ps1 -CreateTestUser"
exit /b 0
