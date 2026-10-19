@echo off
rem Starts the Desk Board server (if it isn't already running) and opens it in its own app window.
cd /d "%~dp0"
start "Desk Board server" /min cmd /c "%~dp0start-server.cmd"
timeout /t 1 /nobreak >nul
start "" msedge --app=http://127.0.0.1:4173
