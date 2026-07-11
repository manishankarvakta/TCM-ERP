import qtawesome as qta
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout, QLabel, QFrame, 
    QPushButton, QScrollArea, QMessageBox
)
from PySide6.QtCore import Qt, QTimer, Slot, Signal
from app.database.database import SessionLocal
from app.database.models import BiometricDevice
from app.core.logger import get_logger

logger = get_logger("Dashboard UI")

class DeviceCard(QFrame):
    clicked = Signal(int)

    def __init__(self, device_id: int, name: str, ip: str, is_online: bool, parent=None):
        super().__init__(parent)
        self.device_id = device_id
        self.setObjectName("card")
        self.setFixedSize(220, 100)
        self.setStyleSheet(
            "QFrame#card { "
            "background-color: #000000; "
            "border: 1px solid #333333; "
            "border-radius: 4px; "
            "}"
        )
        
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(16)
        
        # Crisp FontAwesome server stack vector icon
        icon_lbl = QLabel()
        icon_lbl.setPixmap(qta.icon('fa5.hdd', color='#ffffff').pixmap(32, 32))
        icon_lbl.setStyleSheet("background: transparent; border: none;")
        layout.addWidget(icon_lbl)
        
        # Details text (right)
        details_layout = QVBoxLayout()
        details_layout.setSpacing(4)
        details_layout.setAlignment(Qt.AlignmentFlag.AlignVCenter)
        
        name_lbl = QLabel(name)
        name_lbl.setStyleSheet("font-size: 13px; font-weight: bold; color: #ffffff; border: none; background: transparent;")
        
        ip_lbl = QLabel(ip)
        ip_lbl.setStyleSheet("font-size: 11px; color: #888888; border: none; background: transparent;")
        
        # Status row
        status_row = QHBoxLayout()
        status_row.setSpacing(6)
        status_row.setAlignment(Qt.AlignmentFlag.AlignLeft)
        
        dot = QLabel("●")
        dot_color = "#34c759" if is_online else "#ff3b30"
        dot.setStyleSheet(f"font-size: 12px; color: {dot_color}; border: none; background: transparent;")
        
        status_text = QLabel("Connected" if is_online else "Disconnected")
        status_text.setStyleSheet("font-size: 11px; color: #888888; border: none; background: transparent;")
        
        status_row.addWidget(dot)
        status_row.addWidget(status_text)
        
        details_layout.addWidget(name_lbl)
        details_layout.addWidget(ip_lbl)
        details_layout.addLayout(status_row)
        
        layout.addLayout(details_layout)

    def mousePressEvent(self, event):
        self.clicked.emit(self.device_id)

class DashboardView(QWidget):
    """
    Dashboard Grid View representing active configured network devices.
    """
    device_clicked = Signal(int)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet("background-color: #000000;")
        
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 20, 0, 20)
        main_layout.setSpacing(20)

        # Header Row
        header_layout = QHBoxLayout()
        header_layout.setContentsMargins(0, 0, 10, 0)
        title = QLabel("Devices")
        title.setStyleSheet("font-size: 20px; font-weight: bold; color: #ffffff;")
        
        self.sync_btn = QPushButton("Sync")
        self.sync_btn.setIcon(qta.icon('fa5s.sync-alt', color='#ffffff'))
        self.sync_btn.setObjectName("secondaryBtn")
        self.sync_btn.setFixedSize(90, 36)
        self.sync_btn.clicked.connect(self.run_manual_sync)

        header_layout.addWidget(title)
        header_layout.addStretch()
        header_layout.addWidget(self.sync_btn)
        main_layout.addLayout(header_layout)

        # Scroll Area for device grid
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setStyleSheet("QScrollArea { background-color: #000000; border: none; }")
        
        self.scroll_content = QWidget()
        self.scroll_content.setStyleSheet("background-color: #000000;")
        self.grid_layout = QGridLayout(self.scroll_content)
        self.grid_layout.setSpacing(20)
        self.grid_layout.setAlignment(Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignLeft)
        
        scroll_area.setWidget(self.scroll_content)
        main_layout.addWidget(scroll_area)

        # Timer to refresh device cards
        self.refresh_timer = QTimer(self)
        self.refresh_timer.timeout.connect(self.refresh_data)
        self.refresh_timer.start(5000)
        
        self.refresh_data()

    def clear_grid(self):
        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

    def refresh_data(self):
        db = SessionLocal()
        try:
            devices = db.query(BiometricDevice).all()
            self.clear_grid()
            
            if not devices:
                placeholder = QLabel("No active network devices registered.")
                placeholder.setStyleSheet("color: #888888; font-size: 13px;")
                self.grid_layout.addWidget(placeholder, 0, 0, 1, 4, Qt.AlignmentFlag.AlignCenter)
                return

            columns = 4
            for i, dev in enumerate(devices):
                row = i // columns
                col = i % columns
                is_online = (dev.status == "ONLINE")
                
                card = DeviceCard(dev.id, dev.name, dev.ip_address, is_online)
                card.clicked.connect(self.device_clicked.emit)
                self.grid_layout.addWidget(card, row, col)
                
        except Exception as e:
            logger.error(f"Error refreshing dashboard cards grid: {e}")
        finally:
            db.close()

    def run_manual_sync(self):
        from app.services.sync_service import SyncService
        logger.info("[UI] Triggered manual biometric logs synchronization.")
        self.sync_btn.setEnabled(False)
        self.sync_btn.setText("Syncing...")
        
        try:
            success, failed, msg = SyncService.sync_all_devices()
            QMessageBox.information(
                self, "Sync Complete",
                f"Synchronization complete.\n\n"
                f"Synced punches: {success}\n"
                f"Failed punches: {failed}\n"
                f"Log: {msg}"
            )
        except Exception as e:
            QMessageBox.critical(self, "Sync Error", f"Sync failed: {e}")
        finally:
            self.sync_btn.setEnabled(True)
            self.sync_btn.setText("Sync")
            self.refresh_data()
