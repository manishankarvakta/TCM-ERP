#!/bin/bash

# Detect OS
OS_TYPE=$(uname)

DIR_PATH=$(pwd)
SCRIPT_PATH="$DIR_PATH/start.sh"

echo "Configuring autostart for ffERP Biometric Local Agent..."
echo "Directory: $DIR_PATH"

if [ "$OS_TYPE" = "Darwin" ]; then
    # macOS Setup: LaunchAgent
    PLIST_PATH="$HOME/Library/LaunchAgents/com.fferp.biometric-agent.plist"
    echo "macOS detected. Creating LaunchAgent at: $PLIST_PATH"

    cat <<EOF > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.fferp.biometric-agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$SCRIPT_PATH</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>$DIR_PATH</string>
    <key>StandardOutPath</key>
    <string>$DIR_PATH/logs/daemon.log</string>
    <key>StandardErrorPath</key>
    <string>$DIR_PATH/logs/daemon-error.log</string>
</dict>
</plist>
EOF

    # Make executable and register
    chmod +x "$SCRIPT_PATH"
    launchctl unload "$PLIST_PATH" >/dev/null 2>&1
    launchctl load "$PLIST_PATH"

    echo "✅ Autostart plist created and loaded in launchd."
    echo "To check daemon status: launchctl list | grep biometric-agent"
    echo "To stop daemon: launchctl unload $PLIST_PATH"

elif [ "$OS_TYPE" = "Linux" ]; then
    # Linux Setup: Systemd
    SERVICE_PATH="/etc/systemd/system/fferp-biometric-agent.service"
    echo "Linux detected. Preparing systemd service configuration..."

    cat <<EOF > "$DIR_PATH/fferp-biometric-agent.service"
[Unit]
Description=ffERP Biometric Device Local Agent
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$DIR_PATH
ExecStart=/bin/bash $SCRIPT_PATH
Restart=on-failure
StandardOutput=append:$DIR_PATH/logs/daemon.log
StandardError=append:$DIR_PATH/logs/daemon-error.log

[Install]
WantedBy=multi-user.target
EOF

    chmod +x "$SCRIPT_PATH"

    echo "Prepared systemd file at: $DIR_PATH/fferp-biometric-agent.service"
    echo "To complete installation on Linux, run the following commands:"
    echo "  sudo cp $DIR_PATH/fferp-biometric-agent.service $SERVICE_PATH"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable fferp-biometric-agent"
    echo "  sudo systemctl start fferp-biometric-agent"
    echo "  sudo systemctl status fferp-biometric-agent"

else
    echo "❌ Unsupported OS: $OS_TYPE"
    exit 1
fi
