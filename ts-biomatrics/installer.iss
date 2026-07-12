[Setup]
AppName=TS-Biometrics
AppVersion=1.0.0
DefaultDirName={commonpf}\TS-Biometrics
DefaultGroupName=TS-Biometrics
UninstallDisplayIcon={app}\TS-Biometrics.exe
Compression=lzma2
SolidCompression=yes
OutputDir=release
OutputBaseFilename=TS-Biometrics-Setup
SetupIconFile=app\resources\images\AppIcon.ico
DisableProgramGroupPage=yes
PrivilegesRequired=admin
AppMutex=TSBiometricsGatewayMutex
CloseApplications=yes

[Files]
Source: "dist\TS-Biometrics\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\TS-Biometrics"; Filename: "{app}\TS-Biometrics.exe"
Name: "{commondesktop}\TS-Biometrics"; Filename: "{app}\TS-Biometrics.exe"; Tasks: desktopicon
Name: "{userstartup}\TS-Biometrics"; Filename: "{app}\TS-Biometrics.exe"; Tasks: startupicon

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startupicon"; Description: "Start TS-Biometrics automatically with Windows"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Run]
Filename: "{app}\TS-Biometrics.exe"; Description: "{cm:LaunchProgram,TS-Biometrics}"; Flags: nowait postinstall skipifsilent
