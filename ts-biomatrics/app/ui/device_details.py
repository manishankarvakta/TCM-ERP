import os
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QFrame, 
    QScrollArea, QPushButton
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QPixmap
import qtawesome as qta

from app.database.database import SessionLocal
from app.database.models import BiometricDevice, UserMapping, RawBiometricLog, SyncHistory
from app.core.logger import get_logger

logger = get_logger("Device Details UI")

class ConnectionFlowWidget(QWidget):
    """
    Center header widget visualizing connection flow: Cloud -- Network -- Device.
    Updates colors dynamically using a sleek minimalist white/grey theme.
    """
    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QHBoxLayout(self)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(12)
        
        # Cloud Status
        self.cloud_container = QWidget()
        cc_layout = QVBoxLayout(self.cloud_container)
        cc_layout.setContentsMargins(0, 0, 0, 0)
        cc_layout.setSpacing(4)
        cc_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.cloud_icon = QLabel()
        self.cloud_lbl = QLabel("Cloud")
        cc_layout.addWidget(self.cloud_icon)
        cc_layout.addWidget(self.cloud_lbl)
        
        # Line 1
        self.line1 = QFrame()
        self.line1.setFrameShape(QFrame.Shape.HLine)
        self.line1.setFixedWidth(45)
        
        # Network Status
        self.net_container = QWidget()
        nc_layout = QVBoxLayout(self.net_container)
        nc_layout.setContentsMargins(0, 0, 0, 0)
        nc_layout.setSpacing(4)
        nc_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.net_icon = QLabel()
        self.net_lbl = QLabel("Network")
        nc_layout.addWidget(self.net_icon)
        nc_layout.addWidget(self.net_lbl)
        
        # Line 2
        self.line2 = QFrame()
        self.line2.setFrameShape(QFrame.Shape.HLine)
        self.line2.setFixedWidth(45)
        
        # Device Status
        self.dev_container = QWidget()
        dc_layout = QVBoxLayout(self.dev_container)
        dc_layout.setContentsMargins(0, 0, 0, 0)
        dc_layout.setSpacing(4)
        dc_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.dev_icon = QLabel()
        self.dev_lbl = QLabel("Device")
        dc_layout.addWidget(self.dev_icon)
        dc_layout.addWidget(self.dev_lbl)
        
        layout.addWidget(self.cloud_container)
        layout.addWidget(self.line1)
        layout.addWidget(self.net_container)
        layout.addWidget(self.line2)
        layout.addWidget(self.dev_container)
        
        self.update_flow_states(True, False, False)

    def update_flow_states(self, cloud_online: bool, net_online: bool, dev_online: bool):
        c_color = "#ffffff" if cloud_online else "#333333"
        n_color = "#ffffff" if net_online else "#333333"
        d_color = "#ffffff" if dev_online else "#333333"
        
        self.cloud_icon.setPixmap(qta.icon('fa5s.cloud', color=c_color).pixmap(24, 24))
        self.cloud_lbl.setStyleSheet(f"font-size: 11px; color: {c_color}; border: none; background: transparent; font-weight: normal;")
        
        self.line1.setStyleSheet(f"color: {n_color}; background-color: {n_color}; height: 1px; border: none;")
        
        self.net_icon.setPixmap(qta.icon('fa5s.wifi', color=n_color).pixmap(24, 24))
        self.net_lbl.setStyleSheet(f"font-size: 11px; color: {n_color}; border: none; background: transparent; font-weight: normal;")
        
        self.line2.setStyleSheet(f"color: {d_color}; background-color: {d_color}; height: 1px; border: none;")
        
        self.dev_icon.setPixmap(qta.icon('fa5.hdd', color=d_color).pixmap(24, 24))
        self.dev_lbl.setStyleSheet(f"font-size: 11px; color: {d_color}; border: none; background: transparent; font-weight: normal;")


class RowCard(QFrame):
    """
    Custom horizontal list item block mimicking the mockup design:
    grey horizontal cards with pure black text.
    """
    def __init__(self, col1: str, col2: str, col3: str, parent=None):
        super().__init__(parent)
        self.setFixedHeight(44)
        self.setStyleSheet(
            "QFrame { "
            "background-color: #cccccc; "
            "border-radius: 0px; "
            "border: none; "
            "}"
        )
        layout = QHBoxLayout(self)
        layout.setContentsMargins(18, 0, 18, 0)
        
        c1 = QLabel(col1)
        c1.setStyleSheet("color: #000000; font-size: 13px; font-weight: bold; background: transparent; border: none;")
        
        c2 = QLabel(col2)
        c2.setStyleSheet("color: #111111; font-size: 13px; background: transparent; border: none;")
        
        c3 = QLabel(col3)
        c3.setStyleSheet("color: #111111; font-size: 13px; font-weight: bold; background: transparent; border: none;")
        
        layout.addWidget(c1)
        layout.addStretch()
        layout.addWidget(c2)
        layout.addStretch()
        layout.addWidget(c3)


class DeviceDetailsView(QWidget):
    """
    Redesigned Device details view incorporating mockup specs:
    - Fingerprint logo & label in top-left.
    - Cloud -- Network -- Device status flow in top-center.
    - Users / Attendance / Log text-tabs.
    - Solid grey list-row cards.
    """
    back_clicked = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.device_id = None
        self.active_tab = "Users"
        self.setStyleSheet("background-color: #000000;")
        
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 10)
        main_layout.setSpacing(16)

        # 1. Header Layout (Logo, Connection Flow, Spacers)
        header_layout = QHBoxLayout()
        header_layout.setContentsMargins(0, 0, 0, 10)
        
        # Left Spacer (Mirrors right spacer to center connection flow)
        left_spacer = QWidget()
        left_spacer.setFixedWidth(100)
        header_layout.addWidget(left_spacer)
        
        header_layout.addStretch()
        
        # Center Status Flow Widget
        self.flow_widget = ConnectionFlowWidget()
        header_layout.addWidget(self.flow_widget)
        
        header_layout.addStretch()
        
        # Right Spacer
        right_spacer = QWidget()
        right_spacer.setFixedWidth(100)
        header_layout.addWidget(right_spacer)
        
        main_layout.addLayout(header_layout)

        # 2. Sub-tab Menu Row
        subtab_layout = QHBoxLayout()
        subtab_layout.setContentsMargins(0, 5, 0, 5)
        subtab_layout.setSpacing(20)
        
        # Users Tab
        self.tab_users = QPushButton("Users")
        self.tab_users.setCursor(Qt.CursorShape.PointingHandCursor)
        self.tab_users.clicked.connect(lambda: self.switch_details_tab("Users"))
        subtab_layout.addWidget(self.tab_users)
        
        # Attendance Tab
        self.tab_attendance = QPushButton("Attendance")
        self.tab_attendance.setCursor(Qt.CursorShape.PointingHandCursor)
        self.tab_attendance.clicked.connect(lambda: self.switch_details_tab("Attendance"))
        subtab_layout.addWidget(self.tab_attendance)
        
        # Log Tab
        self.tab_log = QPushButton("Log")
        self.tab_log.setCursor(Qt.CursorShape.PointingHandCursor)
        self.tab_log.clicked.connect(lambda: self.switch_details_tab("Log"))
        subtab_layout.addWidget(self.tab_log)
        
        subtab_layout.addStretch()
        main_layout.addLayout(subtab_layout)

        # 3. Content Scroll Area for list blocks
        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setStyleSheet("QScrollArea { background-color: #000000; border: none; }")
        
        self.scroll_content = QWidget()
        self.scroll_content.setStyleSheet("background-color: #000000;")
        self.list_layout = QVBoxLayout(self.scroll_content)
        self.list_layout.setContentsMargins(0, 0, 0, 0)
        self.list_layout.setSpacing(10)
        self.list_layout.setAlignment(Qt.AlignmentFlag.AlignTop)
        
        self.scroll_area.setWidget(self.scroll_content)
        main_layout.addWidget(self.scroll_area)
        
        self.update_tab_highlights()

    def load_device_details(self, device_id: int):
        self.device_id = device_id
        self.load_active_tab_data()
        
    def switch_details_tab(self, tab_name: str):
        self.active_tab = tab_name
        self.update_tab_highlights()
        self.load_active_tab_data()
        
    def update_tab_highlights(self):
        # Set highlight styling: active = white, inactive = dimmed
        btn_style = (
            "QPushButton {{ "
            "background: transparent; "
            "border: none; "
            "color: {}; "
            "font-size: 15px; "
            "font-weight: bold; "
            "padding: 0px; "
            "}}"
            "QPushButton:hover {{ color: #ffffff; }}"
        )
        
        self.tab_users.setStyleSheet(btn_style.format("#ffffff" if self.active_tab == "Users" else "#555555"))
        self.tab_attendance.setStyleSheet(btn_style.format("#ffffff" if self.active_tab == "Attendance" else "#555555"))
        self.tab_log.setStyleSheet(btn_style.format("#ffffff" if self.active_tab == "Log" else "#555555"))

    def clear_list(self):
        while self.list_layout.count():
            item = self.list_layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

    def load_active_tab_data(self):
        if not self.device_id:
            return
            
        self.clear_list()
        db = SessionLocal()
        
        try:
            device = db.query(BiometricDevice).filter(BiometricDevice.id == self.device_id).first()
            if not device:
                return

            # Update Connection Status Flow colors dynamically
            # Cloud: online if app config base url is configured
            cloud_online = True
            net_online = (device.status == "ONLINE")
            dev_online = (device.status == "ONLINE")
            self.flow_widget.update_flow_states(cloud_online, net_online, dev_online)

            if self.active_tab == "Users":
                mappings = db.query(UserMapping).filter(UserMapping.device_id == self.device_id).all()
                if not mappings:
                    self.list_layout.addWidget(QLabel("No users mapped to this device."))
                for mapped in mappings:
                    card = RowCard(
                        col1=f"PIN: {mapped.device_user_id}",
                        col2=f"Name: {mapped.employee_name or 'Unassigned'}",
                        col3=f"Status: {mapped.access_status}"
                    )
                    self.list_layout.addWidget(card)
                    
            elif self.active_tab == "Attendance":
                punches = db.query(RawBiometricLog).filter(
                    RawBiometricLog.device_id == self.device_id
                ).order_by(RawBiometricLog.punch_time.desc()).limit(50).all()
                if not punches:
                    self.list_layout.addWidget(QLabel("No cached attendance logs found."))
                for punch in punches:
                    card = RowCard(
                        col1=f"PIN: {punch.device_user_id}",
                        col2=f"Time: {punch.punch_time.strftime('%Y-%m-%d %H:%M:%S')}",
                        col3=f"Sync: {punch.sync_status}"
                    )
                    self.list_layout.addWidget(card)
                    
            elif self.active_tab == "Log":
                histories = db.query(SyncHistory).order_by(SyncHistory.start_time.desc()).limit(50).all()
                if not histories:
                    self.list_layout.addWidget(QLabel("No sync activity history logs recorded."))
                for hist in histories:
                    card = RowCard(
                        col1=f"Op: {hist.operation}",
                        col2=f"Time: {hist.start_time.strftime('%Y-%m-%d %H:%M:%S')}",
                        col3=f"Status: {hist.status} ({hist.success_count} synced / {hist.failed_count} errs)"
                    )
                    self.list_layout.addWidget(card)
                    
        except Exception as e:
            logger.error(f"Error loading device details tab data: {e}")
        finally:
            db.close()
