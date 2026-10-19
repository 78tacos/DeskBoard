@echo off
rem Starts the Wartburg web app at https://localhost:7073 (needs the .NET 10 SDK and PostgreSQL running).
rem Same settings as the "https" launch profile, minus auto-opening a browser. Output goes to launchers\logs\wartburg.log
if not exist "%~dp0logs" mkdir "%~dp0logs"
cd /d "%USERPROFILE%\Development\Wartburg" || exit /b 1
set "ASPNETCORE_ENVIRONMENT=Development"
set "ASPNETCORE_URLS=https://localhost:7073;http://localhost:5099"
dotnet run --project src/Wartburg.Web --no-launch-profile >> "%~dp0logs\wartburg.log" 2>&1
