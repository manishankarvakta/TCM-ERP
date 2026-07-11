import os
import sys
import subprocess
from pathlib import Path

def build():
    print("=== TS-Biomatrics Windows Executable Builder ===")
    
    # Path setups
    root = Path(__file__).resolve().parent
    icon_path = root / "app" / "resources" / "images" / "AppIcon.ico"
    main_script = root / "app" / "main.py"
    
    if not icon_path.exists():
        print(f"Error: Icon not found at {icon_path}")
        sys.exit(1)
        
    print("Installing PyInstaller and build dependencies...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt", "pyinstaller", "Pillow"], check=True)
    
    print("\nCompiling executable using PyInstaller...")
    # Add resources folder to PyInstaller bundle data
    # format on Windows: source;destination  on Unix: source:destination
    add_data_flag = "app/resources;app/resources" if os.name == 'nt' else "app/resources:app/resources"
    
    # Resolve pyinstaller binary path relative to current python execution context
    pyinstaller_bin = Path(sys.executable).parent / "pyinstaller"
    if not pyinstaller_bin.exists():
        pyinstaller_bin = "pyinstaller"
        if os.name == 'nt':
            pyinstaller_bin += ".exe"
            
    cmd = [
        str(pyinstaller_bin),
        "--noconsole",
        "--onefile",
        f"--icon={icon_path}",
        f"--add-data={add_data_flag}",
        "--name=TS-Biomatrics",
        str(main_script)
    ]
    
    print(f"Running command: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)
    
    print("\n=== Compilation Complete! ===")
    ext = ".exe" if os.name == 'nt' else ""
    binary_path = root / "dist" / f"TS-Biomatrics{ext}"
    print(f"Generated binary path: {binary_path}")

if __name__ == "__main__":
    build()
