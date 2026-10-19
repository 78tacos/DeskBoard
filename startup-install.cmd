@echo off
rem Makes the Desk Board server start (hidden) whenever you sign in to Windows.
rem It only adds one small file to your Startup folder. Run startup-remove.cmd to undo it.
set "TARGET=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\DeskBoard-server.vbs"
> "%TARGET%" echo CreateObject("Wscript.Shell").Run "cmd /c ""%~dp0start-server.cmd""", 0, False
if exist "%TARGET%" (
  echo Installed: the Desk Board server will start when you sign in.
  echo File: %TARGET%
) else (
  echo Could not write to your Startup folder.
)
pause
