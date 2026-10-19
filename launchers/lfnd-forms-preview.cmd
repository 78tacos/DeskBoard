@echo off
rem Starts the LFND forms preview (vite) at http://127.0.0.1:5173. Output goes to launchers\logs\lfnd-forms-preview.log
if not exist "%~dp0logs" mkdir "%~dp0logs"
cd /d "%USERPROFILE%\Development\LFND-M365-Tools" || exit /b 1
call npm run preview >> "%~dp0logs\lfnd-forms-preview.log" 2>&1
