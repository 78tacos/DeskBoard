@echo off
rem Starts WGUpdater from source (needs the .NET SDK). Output goes to launchers\logs\wgupdater.log
if not exist "%~dp0logs" mkdir "%~dp0logs"
cd /d "%USERPROFILE%\Development\WGUpdater" || exit /b 1
dotnet run --project src\WGUpdater.App >> "%~dp0logs\wgupdater.log" 2>&1
