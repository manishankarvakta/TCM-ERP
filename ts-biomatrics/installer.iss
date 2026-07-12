[Setup]
AppName=TS-Biomatrics
AppVersion=1.0.0
DefaultDirName={autopf}\TS-Biomatrics
DefaultGroupName=TS-Biomatrics
UninstallDisplayIcon={app}\TS-Biomatrics.exe
Compression=lzma2
SolidCompression=yes
OutputDir=dist
OutputBaseFilename=TS-Biomatrics-Setup
SetupIconFile=app\resources\images\AppIcon.ico
DisableProgramGroupPage=yes

[Files]
Source: "dist\TS-Biomatrics.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\TS-Biomatrics"; Filename: "{app}\TS-Biomatrics.exe"
Name: "{commondesktop}\TS-Biomatrics"; Filename: "{app}\TS-Biomatrics.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Run]
Filename: "{app}\TS-Biomatrics.exe"; Description: "{cm:LaunchProgram,TS-Biomatrics}"; Flags: nowait postinstall skipifsilent
