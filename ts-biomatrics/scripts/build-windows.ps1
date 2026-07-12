# TS-Biometrics Windows release build automation script
$ErrorActionPreference = "Stop"

Write-Host "=== TS-Biometrics Release Builder ==="

# 1. Verify OS environment is Windows
if ($env:OS -notmatch "Windows") {
    Write-Error "This script can only be executed on Windows hosts."
    exit 1
}

# 2. Verify Python environment
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python executable not found. Make sure Python is installed and in your environment PATH."
    exit 1
}

# 3. Locate active virtualenv Python
$python_cmd = "python"
if (Test-Path "venv\Scripts\python.exe") {
    $python_cmd = "venv\Scripts\python.exe"
    Write-Host "Using virtual environment Python: $python_cmd"
}

# 4. Check required source files
$required_files = @("app/main.py", "TS-Biomatrics.spec", "installer.iss", "file_version_info.txt")
foreach ($file in $required_files) {
    if (!(Test-Path $file)) {
        Write-Error "Required file not found: $file"
        exit 1
    }
}

# 5. Clean generated build directories
Write-Host "Cleaning build, dist, and release folders..."
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "release") { Remove-Item -Recurse -Force "release" }
New-Item -ItemType Directory -Force -Path "release" | Out-Null

# 6. Run dependency validation
Write-Host "Checking package dependencies..."
& $python_cmd -m pip check

# 7. Run syntax compilation
Write-Host "Compiling Python source syntax..."
& $python_cmd -m compileall app

# 8. Run available smoke tests
Write-Host "Executing smoke tests..."
& $python_cmd -m pytest tests/test_smoke.py

# 9. Run PyInstaller build
Write-Host "Running PyInstaller..."
& $python_cmd -m PyInstaller --clean --noconfirm TS-Biomatrics.spec

# 10. Verify expected EXE exists
$exe_path = "dist\TS-Biometrics\TS-Biometrics.exe"
if (!(Test-Path $exe_path)) {
    Write-Error "Executable build failed. Target not found: $exe_path"
    exit 1
}
Write-Host "Executable generated successfully: $exe_path"

# 11. Generate ZIP archive of the portable build
Write-Host "Archiving portable build to ZIP..."
$zip_path = "release\TS-Biometrics-Windows-1.0.0.zip"
Compress-Archive -Path "dist\TS-Biometrics\*" -DestinationPath $zip_path -Force

# 12. Build the Inno Setup installer if iscc.exe is available
$iscc = Get-Command iscc -ErrorAction SilentlyContinue
if ($iscc) {
    Write-Host "Compiling Windows Installer using Inno Setup..."
    & iscc installer.iss
} else {
    Write-Host "Inno Setup compiler (iscc) not found in PATH. Skipping installer compilation."
}

# 13. Generate SHA-256 Checksums
Write-Host "Generating SHA-256 checksums..."
$checksums_file = "release\SHA256SUMS.txt"
$zip_hash = (Get-FileHash -Algorithm SHA256 $zip_path).Hash.ToLower()
"Zip Checksum: $zip_hash ($zip_path)" | Out-File -FilePath $checksums_file

if (Test-Path "release\TS-Biometrics-Setup.exe") {
    $setup_hash = (Get-FileHash -Algorithm SHA256 "release\TS-Biometrics-Setup.exe").Hash.ToLower()
    "Installer Checksum: $setup_hash (release\TS-Biometrics-Setup.exe)" | Out-File -FilePath $checksums_file -Append
}

Write-Host "=== Build Completed Successfully ==="
Write-Host "Outputs located in 'release/' folder:"
Get-ChildItem "release/"
