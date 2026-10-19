@echo off
rem Runs the Desk Board server (no window of its own). Used by start.cmd and by Windows startup.
cd /d "%~dp0"
rem Behind a firewall that inspects HTTPS? Save its CA certificate here as ca.pem so AI providers can be reached.
if exist "%~dp0ca.pem" set "NODE_EXTRA_CA_CERTS=%~dp0ca.pem"
set "NODE_USE_SYSTEM_CA=1"
node server.js
