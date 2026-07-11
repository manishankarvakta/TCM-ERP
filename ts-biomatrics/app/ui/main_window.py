import os
import datetime
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QStackedWidget, 
    QFrame, QLabel, QPushButton, QSystemTrayIcon, QMenu, QSizePolicy
)
from PySide6.QtCore import Qt, Slot, Signal, QThread, QTimer
from PySide6.QtGui import QAction, QPixmap
import qtawesome as qta

from app.core.config import APP_NAME, APP_VERSION
from app.database.database import SessionLocal
from app.database.models import AppConfig
from app.core.logger import get_logger
from app.ui.theme import QSS_THEME
from app.ui.splash import SplashView
from app.ui.setup import SetupWizard
from app.ui.login import LoginView
from app.ui.dashboard import DashboardView
from app.ui.logs_view import LogsView
from app.ui.settings import SettingsView
from app.ui.device_details import DeviceDetailsView

logger = get_logger("UI")

class StartupDiagnosticsWorker(QThread):
    finished = Signal(bool, str)

    def run(self):
        try:
            from app.services.sync_service import SyncService
            success, msg = SyncService.sync_devices_from_cloud()
            self.finished.emit(success, msg)
        except Exception as e:
            self.finished.emit(False, str(e))

class BottomTabButton(QFrame):
    clicked = Signal(int)
    
    def __init__(self, index: int, icon_name: str, label_text: str, parent=None):
        super().__init__(parent)
        self.index = index
        self.icon_name = icon_name
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setObjectName("tabBtn")
        self.setFixedWidth(100)
        self.setFixedHeight(65)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(4, 6, 4, 6)
        layout.setSpacing(4)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        # Icon Label
        self.icon_lbl = QLabel()
        self.icon_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.icon_lbl.setStyleSheet("background: transparent; border: none;")
        layout.addWidget(self.icon_lbl)
        
        # Label Text
        self.label = QLabel(label_text)
        self.label.setStyleSheet("font-size: 11px; color: #888888; background: transparent; border: none;")
        self.label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.label)
        
        self.set_active(False)
        
    def set_active(self, active: bool):
        color = "#ffffff" if active else "#888888"
        self.icon_lbl.setPixmap(qta.icon(self.icon_name, color=color).pixmap(20, 20))
        self.label.setStyleSheet(f"font-size: 11px; color: {color}; background: transparent; border: none; font-weight: {'bold' if active else 'normal'};")
        
    def mousePressEvent(self, event):
        self.clicked.emit(self.index)

class MainWindow(QMainWindow):
    """
    Main shell window managing views and bottom tab navigation.
    """
    def __init__(self):
        super().__init__()
        
        self.setWindowTitle(f"{APP_NAME} Gateway")
        self.resize(1100, 700)
        self.setStyleSheet(QSS_THEME)

        self.is_authenticated = False

        # Stack for welcome setup vs main app layout
        self.main_stack = QStackedWidget()
        self.setCentralWidget(self.main_stack)

        self.setup_tray_icon()
        self.init_views()
        
        # Show pulsating loading splash screen initially
        self.main_stack.setCurrentIndex(0)
        QTimer.singleShot(3000, self.route_application)

    def setup_tray_icon(self):
        self.tray_icon = QSystemTrayIcon(self)
        self.tray_icon.setIcon(self.style().standardIcon(self.style().StandardPixmap.SP_ComputerIcon))
        
        tray_menu = QMenu(self)
        open_action = QAction("Open TS-Biomatrics", self)
        open_action.triggered.connect(self.showNormal)
        
        sync_action = QAction("Run Biometric Sync", self)
        sync_action.triggered.connect(self.trigger_manual_sync)
        
        exit_action = QAction("Exit", self)
        exit_action.triggered.connect(self.close_application)
        
        tray_menu.addAction(open_action)
        tray_menu.addAction(sync_action)
        tray_menu.addSeparator()
        tray_menu.addAction(exit_action)
        
        self.tray_icon.setContextMenu(tray_menu)
        self.tray_icon.show()
        self.tray_icon.activated.connect(self.tray_icon_activated)

    def tray_icon_activated(self, reason):
        if reason == QSystemTrayIcon.ActivationReason.Trigger:
            if self.isVisible():
                self.hide()
            else:
                self.showNormal()
                self.activateWindow()

    def trigger_manual_sync(self):
        from app.services.sync_service import SyncService
        logger.info("Tray Trigger: Initiating manual sync.")
        success, failed, msg = SyncService.sync_all_devices()
        self.tray_icon.showMessage(
            "Sync Complete", 
            f"Success: {success}, Failed: {failed}", 
            QSystemTrayIcon.MessageIcon.Information, 
            3000
        )

    def close_application(self):
        from app.core.scheduler import stop_scheduler
        stop_scheduler()
        self.tray_icon.hide()
        os._exit(0)

    def closeEvent(self, event):
        self.close_application()

    def init_views(self):
        # 0. Pulsating Loading Screen
        self.splash_view = SplashView()
        self.main_stack.addWidget(self.splash_view)

        # 1. Setup Wizard
        self.wizard = SetupWizard()
        self.wizard.setup_completed.connect(self.on_setup_completed)
        self.main_stack.addWidget(self.wizard)

        # 2. Login View
        self.login_view = LoginView()
        self.login_view.login_successful.connect(self.on_login_successful)
        self.main_stack.addWidget(self.login_view)

        # 3. Main Dashboard Layout (Tab Bar shell)
        self.dashboard_layout = QWidget()
        self.setup_main_dashboard_layout()
        self.main_stack.addWidget(self.dashboard_layout)

    def setup_main_dashboard_layout(self):
        layout = QVBoxLayout(self.dashboard_layout)
        layout.setContentsMargins(32, 24, 32, 24)
        layout.setSpacing(12)

        # 1. Top Header Row (Logo Branding + brand name)
        header_row = QHBoxLayout()
        header_row.setContentsMargins(0, 0, 0, 0)
        
        brand_layout = QVBoxLayout()
        brand_layout.setSpacing(4)
        
        from app.core.config import BASE_DIR
        logo_label = QLabel()
        logo_pix = QPixmap(str(BASE_DIR / "app" / "resources" / "images" / "fingerprint.png"))
        if not logo_pix.isNull():
            logo_label.setPixmap(logo_pix.scaled(40, 40, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))
        else:
            logo_label.setText("🔘")
            logo_label.setStyleSheet("font-size: 20px; color: #ffffff;")
            
        brand_label = QLabel("TS Biometrics")
        brand_label.setStyleSheet("font-size: 11px; font-weight: bold; color: #ffffff;")
        
        brand_layout.addWidget(logo_label, alignment=Qt.AlignmentFlag.AlignLeft)
        brand_layout.addWidget(brand_label, alignment=Qt.AlignmentFlag.AlignLeft)
        header_row.addLayout(brand_layout)
        header_row.addStretch()

        layout.addLayout(header_row)

        # 2. View Stack inside Central Widget
        self.content_stack = QStackedWidget()
        self.content_stack.setStyleSheet("background-color: #000000;")

        # Instantiate View Widgets
        self.view_dashboard = DashboardView()
        self.view_logs = LogsView()
        self.view_settings = SettingsView()
        self.view_details = DeviceDetailsView()

        # Connect signals for page redirect routing
        self.view_dashboard.device_clicked.connect(self.show_device_details)
        self.view_details.back_clicked.connect(self.show_devices_grid)
        self.view_settings.config_saved.connect(self.run_settings_diagnostics)

        # Add to stack
        self.content_stack.addWidget(self.view_dashboard)     # Index 0
        self.content_stack.addWidget(self.view_logs)          # Index 1
        self.content_stack.addWidget(self.view_settings)      # Index 2
        self.content_stack.addWidget(self.view_details)       # Index 3

        layout.addWidget(self.content_stack)

        # 3. Horizontal separator line above bottom nav bar
        sep = QFrame()
        sep.setFrameShape(QFrame.Shape.HLine)
        sep.setStyleSheet("color: #333333; background-color: #333333; border: none; height: 1px;")
        layout.addWidget(sep)

        # 4. Bottom Tab Bar
        bottom_nav_bar = QHBoxLayout()
        bottom_nav_bar.setContentsMargins(0, 8, 0, 8)
        bottom_nav_bar.setAlignment(Qt.AlignmentFlag.AlignCenter)
        bottom_nav_bar.setSpacing(40)

        self.nav_buttons = []
        nav_items = [
            (0, "fa5.hdd", "Device"),
            (1, "fa5.file-alt", "Log"),
            (2, "fa5s.cog", "Settings"),
            (3, "fa5s.sign-out-alt", "Logout")
        ]

        for idx, icon_type, label in nav_items:
            btn = BottomTabButton(idx, icon_type, label)
            btn.clicked.connect(self.switch_content_view)
            if idx == 0:
                btn.set_active(True)
            bottom_nav_bar.addWidget(btn)
            self.nav_buttons.append(btn)

        layout.addLayout(bottom_nav_bar)

    def switch_content_view(self, index: int):
        if index == 3:  # Logout button
            self.handle_logout()
            return

        self.content_stack.setCurrentIndex(index)
        for i, btn in enumerate(self.nav_buttons):
            if btn.index != 3:
                btn.set_active(i == index)
            
        # Refresh dynamic screens when clicked
        if index == 0:
            self.view_dashboard.refresh_data()
        elif index == 2:
            self.view_settings.load_settings()

    def handle_logout(self):
        logger.info("Admin logged out. Returning to login screen.")
        self.is_authenticated = False
        
        # Reset navigation highlighting to Device tab
        for btn in self.nav_buttons:
            btn.set_active(btn.index == 0)
            
        # Reset views
        self.content_stack.setCurrentIndex(0)
        self.login_view.pass_input.clear()
        self.login_view.load_admin_details()
        
        # Switch main stack back to Login screen (Index 2)
        self.main_stack.setCurrentIndex(2)

    def show_device_details(self, device_id: int):
        self.view_details.load_device_details(device_id)
        self.content_stack.setCurrentIndex(3)
        # Highlight "Device" tab when viewing sub-details
        for i, btn in enumerate(self.nav_buttons):
            btn.set_active(i == 0)

    def show_devices_grid(self):
        self.content_stack.setCurrentIndex(0)
        self.view_dashboard.refresh_data()
        for i, btn in enumerate(self.nav_buttons):
            btn.set_active(i == 0)

    def run_settings_diagnostics(self):
        logger.info("Credentials updated. Running connection tests and refreshing device configurations...")
        self.diagnostics_worker = StartupDiagnosticsWorker(self)
        self.diagnostics_worker.finished.connect(self.on_diagnostics_finished)
        self.diagnostics_worker.start()

    def route_application(self):
        db = SessionLocal()
        config = db.query(AppConfig).first()
        db.close()

        if not config or not config.setup_completed:
            self.main_stack.setCurrentIndex(1)
        else:
            self.main_stack.setCurrentIndex(2)

    @Slot()
    def on_setup_completed(self):
        self.main_stack.setCurrentIndex(2)
        self.login_view.load_admin_details()

    @Slot()
    def on_login_successful(self):
        self.is_authenticated = True
        self.main_stack.setCurrentIndex(3)
        self.view_dashboard.refresh_data()
        
        logger.info("Initializing startup diagnostics: Fetching configurations and verifying device states...")
        self.diagnostics_worker = StartupDiagnosticsWorker(self)
        self.diagnostics_worker.finished.connect(self.on_diagnostics_finished)
        self.diagnostics_worker.start()

    @Slot(bool, str)
    def on_diagnostics_finished(self, success, msg):
        if success:
            logger.info(f"Startup diagnostics complete: {msg}")
        else:
            logger.error(f"Startup diagnostics failed: {msg}")
        
        self.view_dashboard.refresh_data()
        
        from app.core.scheduler import start_scheduler
        start_scheduler()
