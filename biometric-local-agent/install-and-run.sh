#!/bin/bash

echo "Starting ffERP Biometric Local Agent..."

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Please install Node.js 20+ first."
  exit 1
fi

# 2. Check npm
if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed. Please install npm first."
  exit 1
fi

# 3. Install dependencies
if [ ! -d "node_modules" ]; then
  echo "node_modules folder not found. Installing dependencies..."
  npm install
else
  echo "Dependencies are already installed."
fi

# 4. Create directories
mkdir -p data
mkdir -p logs

# 5. Handle .env file
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo ".env file created from .env.example. Please review and update parameters."
  else
    echo "Warning: .env.example not found. Creating empty .env."
    touch .env
  fi
fi

# 6. Start the agent
echo "Launching agent..."
npm start
