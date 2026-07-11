#!/bin/bash
set -e

# Change directory to the script's dir
cd "$(dirname "$0")"

echo "=== TS-Biomatrics Developer Launcher ==="

# 1. Virtual Environment Setup
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# 2. Dependency Installation
echo "Installing dependencies..."
pip install -r requirements.txt

# 3. Launch App
echo "Launching TS-Biomatrics..."
python app/main.py
