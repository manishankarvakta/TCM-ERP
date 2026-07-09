@echo off
set "targetScript=%~dp0start.bat"
set "shortcutName=%USERPROFILE%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\BiometricLocalAgent.lnk"

echo Creating autostart shortcut for Windows Startup folder...
echo Target: %targetScript%
echo Destination: %shortcutName%

:: Write temporary VBScript helper to generate the shortcut
set "vbsFile=%temp%\CreateShortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%vbsFile%"
echo sLinkFile = "%shortcutName%" >> "%vbsFile%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%vbsFile%"
echo oLink.TargetPath = "%targetScript%" >> "%vbsFile%"
echo oLink.WorkingDirectory = "%~dp0" >> "%vbsFile%"
echo oLink.Save >> "%vbsFile%"

:: Execute VBScript and clean up
cscript /nologo "%vbsFile%"
del "%vbsFile%"

echo ✅ Startup shortcut created in Windows Startup folder.
pause
