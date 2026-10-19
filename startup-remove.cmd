@echo off
rem Stops the Desk Board server from starting at sign-in.
set "TARGET=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\DeskBoard-server.vbs"
if exist "%TARGET%" (
  del "%TARGET%"
  echo Removed. The Desk Board server will no longer start at sign-in.
) else (
  echo Nothing to remove.
)
pause
