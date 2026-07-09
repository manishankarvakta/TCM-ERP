@echo off
echo Starting ffERP Biometric Local Agent...

where node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
  echo Node.js is not installed. Please install Node.js 20+.
  pause
  exit /b
)

where npm >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
  echo npm is not installed.
  pause
  exit /b
)

IF NOT EXIST node_modules (
  echo Installing dependencies...
  npm install
)

IF NOT EXIST data mkdir data
IF NOT EXIST logs mkdir logs

IF NOT EXIST .env (
  IF EXIST .env.example (
    copy .env.example .env
    echo .env file created from .env.example. Please review and update parameters.
    pause
    exit /b
  ) ELSE (
    echo. > .env
    echo Empty .env file created.
  )
)

npm start
pause
