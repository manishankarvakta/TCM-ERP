import os
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QTextEdit
)
from PySide6.QtCore import QTimer, Qt
from PySide6.QtGui import QFont
from app.core.config import DEFAULT_LOG_PATH
from app.core.logger import get_logger

logger = get_logger("Logs UI")

class LogsView(QWidget):
    """
    Logs View displaying real-time system sync activities.
    """
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet("background-color: #000000;")
        
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 20, 0, 20)
        main_layout.setSpacing(16)

        # Header Row
        header_layout = QHBoxLayout()
        header_layout.setContentsMargins(0, 0, 10, 0)
        title = QLabel("Log Console")
        title.setStyleSheet("font-size: 20px; font-weight: bold; color: #ffffff;")
        
        clear_btn = QPushButton("Clear")
        clear_btn.setObjectName("secondaryBtn")
        clear_btn.setFixedSize(80, 36)
        clear_btn.clicked.connect(self.clear_console)

        header_layout.addWidget(title)
        header_layout.addStretch()
        header_layout.addWidget(clear_btn)
        main_layout.addLayout(header_layout)

        # Monospace Text Terminal
        self.console_text = QTextEdit()
        self.console_text.setReadOnly(True)
        self.console_text.setFont(QFont("Courier New", 11 if os.name == 'nt' else 12))
        self.console_text.setStyleSheet(
            "QTextEdit { "
            "background-color: #000000; "
            "color: #cccccc; "
            "border: 1px solid #333333; "
            "border-radius: 4px; "
            "line-height: 1.4; "
            "}"
        )
        main_layout.addWidget(self.console_text)

        # Console polling timer
        self.log_timer = QTimer(self)
        self.log_timer.timeout.connect(self.poll_logs)
        self.log_timer.start(1000)
        self.last_tell = 0
        
        self.init_log_read()

    def init_log_read(self):
        if not os.path.exists(DEFAULT_LOG_PATH):
            return
        try:
            file_size = os.path.getsize(DEFAULT_LOG_PATH)
            start_pos = max(0, file_size - 80000)
            with open(DEFAULT_LOG_PATH, 'r', encoding='utf-8', errors='ignore') as f:
                f.seek(start_pos)
                content = f.read()
                self.console_text.setPlainText(content)
                self.console_text.verticalScrollBar().setValue(
                    self.console_text.verticalScrollBar().maximum()
                )
                self.last_tell = f.tell()
        except Exception as e:
            self.console_text.setPlainText(f"Failed to initialize logs console: {e}")

    def poll_logs(self):
        if not os.path.exists(DEFAULT_LOG_PATH):
            return
        try:
            file_size = os.path.getsize(DEFAULT_LOG_PATH)
            if file_size < self.last_tell:
                self.last_tell = 0
                self.console_text.clear()

            if file_size > self.last_tell:
                with open(DEFAULT_LOG_PATH, 'r', encoding='utf-8', errors='ignore') as f:
                    f.seek(self.last_tell)
                    new_logs = f.read()
                    self.last_tell = f.tell()
                    if new_logs:
                        self.console_text.append(new_logs.strip('\n'))
                        self.console_text.verticalScrollBar().setValue(
                            self.console_text.verticalScrollBar().maximum()
                        )
        except Exception:
            pass

    def clear_console(self):
        self.console_text.clear()
