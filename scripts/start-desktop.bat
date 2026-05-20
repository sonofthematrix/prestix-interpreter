@echo off
title Prestix Desktop Launcher
cd /d "%~dp0.."

echo ============================================
echo   Prestix — Voice Assistant Desktop
echo ============================================
echo.

echo [1/2] Starting Next.js dev server on :4318 ...
start "Prestix Server" /MIN cmd /c "bun run dev"

echo Waiting for server to be ready...
:wait
timeout /t 2 /nobreak >nul
curl -s http://localhost:4318 >nul 2>&1
if errorlevel 1 goto wait

echo Server ready!
echo.

echo [2/2] Launching Prestix desktop window...
start "" /WAIT bun run desktop:electron

echo.
echo Prestix closed. Shutting down...
taskkill /FI "WINDOWTITLE eq Prestix Server" /F >nul 2>&1
