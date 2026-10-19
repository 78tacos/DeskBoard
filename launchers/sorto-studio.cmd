@echo off
rem Starts the Sorto studio (local explorer for the Power App) at http://127.0.0.1:8765
rem Command from Sorto\tools\studio\server.py. Output goes to launchers\logs\sorto-studio.log
if not exist "%~dp0logs" mkdir "%~dp0logs"
cd /d "%USERPROFILE%\Development\Sorto" || exit /b 1
uv run --python 3.13 tools/studio/server.py >> "%~dp0logs\sorto-studio.log" 2>&1
