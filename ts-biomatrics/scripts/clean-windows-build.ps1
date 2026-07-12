# Clean Windows build directories
$ErrorActionPreference = "Stop"

Write-Host "=== Cleaning Build Directories ==="

$paths_to_clean = @("build", "dist", "release")
foreach ($path in $paths_to_clean) {
    if (Test-Path $path) {
        Write-Host "Removing directory: $path"
        Remove-Item -Recurse -Force $path
    }
}

# Clean local PyInstaller cache if found in user home directory
$pyinstaller_cache = Join-Path $HOME "Library\Caches\PyInstaller" # mac default path
if ($OS -match "Windows") {
    $pyinstaller_cache = Join-Path $env:LOCALAPPDATA "pyinstaller\bcache"
}

if (Test-Path $pyinstaller_cache) {
    Write-Host "Cleaning PyInstaller build cache: $pyinstaller_cache"
    Remove-Item -Recurse -Force $pyinstaller_cache
}

Write-Host "Clean operations completed successfully."
