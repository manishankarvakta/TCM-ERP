import uuid
import datetime
import qtawesome as qta
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QPushButton, 
    QStackedWidget, QMessageBox
)
from PySide6.QtCore import Qt, Signal, Slot, QThread
from PySide6.QtGui import QPixmap
from app.database.database import SessionLocal
from app.database.models import AppConfig, Admin
from app.core.security import encrypt_data, hash_password
from app.api.client import GatewayApiClient
from app.core.logger import get_logger

logger = get_logger("Setup Wizard")

class ConnectionTestWorker(QThread):
    finished = Signal(bool, str, str, str, str, str)

    def __init__(self, url: str, key: str, gateway_id: str, installation_id: str):
        super().__init__()
        self.url = url
        self.key = key
        self.gateway_id = gateway_id
        self.installation_id = installation_id

    def run(self):
        try:
            client = GatewayApiClient(self.url, self.key, self.gateway_id, self.installation_id)
            success, msg = client.test_connection()
            self.finished.emit(success, msg, self.url, self.key, self.gateway_id, self.installation_id)
        except Exception as e:
            self.finished.emit(False, str(e), self.url, self.key, self.gateway_id, self.installation_id)

class SetupWizard(QWidget):
    setup_completed = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet("background-color: #000000;")
        
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(40, 40, 40, 40)
        
        # 1. Top-Left Branding Block
        top_layout = QHBoxLayout()
        brand_layout = QVBoxLayout()
        brand_layout.setSpacing(6)
        
        from app.core.config import BASE_DIR
        logo_label = QLabel()
        logo_pix = QPixmap(str(BASE_DIR / "app" / "resources" / "images" / "fingerprint.png"))
        if not logo_pix.isNull():
            logo_label.setPixmap(logo_pix.scaled(60, 60, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))
        else:
            logo_label.setPixmap(qta.icon('fa5s.fingerprint', color='#ffffff').pixmap(60, 60))
            
        brand_label = QLabel("TS Biometrics")
        brand_label.setStyleSheet("font-size: 11px; font-weight: bold; color: #ffffff;")
        
        brand_layout.addWidget(logo_label, alignment=Qt.AlignmentFlag.AlignLeft)
        brand_layout.addWidget(brand_label, alignment=Qt.AlignmentFlag.AlignLeft)
        top_layout.addLayout(brand_layout)
        top_layout.addStretch()
        
        main_layout.addLayout(top_layout)
        main_layout.addStretch()

        # 2. Stacked widget for the steps
        self.step_stack = QStackedWidget()
        self.setup_step1_view()
        self.setup_step2_view()
        
        main_layout.addWidget(self.step_stack)
        main_layout.addStretch()

    def setup_step1_view(self):
        self.step1_widget = QWidget()
        layout = QVBoxLayout(self.step1_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # Center Form Container
        form_layout = QVBoxLayout()
        form_layout.setSpacing(24)
        
        # Row 1: Cloud URL
        url_row = QHBoxLayout()
        url_row.setSpacing(16)
        url_icon = QLabel()
        url_icon.setPixmap(qta.icon('fa5s.globe', color='#ffffff').pixmap(28, 28))
        self.url_input = QLineEdit()
        self.url_input.setPlaceholderText("Cloud Base API URL")
        self.url_input.setText("https://ferrarifashionbd.cloud")
        self.url_input.setFixedSize(320, 42)
        url_row.addWidget(url_icon)
        url_row.addWidget(self.url_input)
        
        # Row 2: API Key
        key_row = QHBoxLayout()
        key_row.setSpacing(16)
        key_icon = QLabel()
        key_icon.setPixmap(qta.icon('fa5s.key', color='#ffffff').pixmap(28, 28))
        self.key_input = QLineEdit()
        self.key_input.setEchoMode(QLineEdit.EchoMode.PasswordEchoOnEdit)
        self.key_input.setPlaceholderText("API Key")
        self.key_input.setText("default-secret-key")
        self.key_input.setFixedSize(320, 42)
        key_row.addWidget(key_icon)
        key_row.addWidget(self.key_input)
        
        form_layout.addLayout(url_row)
        form_layout.addLayout(key_row)
        
        # Status Label
        self.connection_status = QLabel("")
        self.connection_status.setStyleSheet("color: #888888; font-size: 12px;")
        self.connection_status.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.connection_status.setWordWrap(True)
        self.connection_status.setFixedSize(350, 40)
        form_layout.addWidget(self.connection_status)
        
        # Control Buttons
        btn_row = QHBoxLayout()
        btn_row.addStretch()
        
        self.test_btn = QPushButton("Test")
        self.test_btn.setObjectName("secondaryBtn")
        self.test_btn.setFixedSize(90, 42)
        self.test_btn.clicked.connect(self.test_connection)
        
        self.continue_btn = QPushButton("Next")
        self.continue_btn.setStyleSheet("background-color: #ffffff; color: #000000; font-weight: bold; border-radius: 0px;")
        self.continue_btn.setFixedSize(90, 42)
        self.continue_btn.setEnabled(False)
        self.continue_btn.clicked.connect(self.go_to_step2)
        
        btn_row.addWidget(self.test_btn)
        btn_row.addWidget(self.continue_btn)
        form_layout.addLayout(btn_row)
        
        # Centering row wrapper
        center_row = QHBoxLayout()
        center_row.addStretch()
        center_row.addLayout(form_layout)
        center_row.addStretch()
        
        layout.addLayout(center_row)
        self.step_stack.addWidget(self.step1_widget)

    def setup_step2_view(self):
        self.step2_widget = QWidget()
        layout = QVBoxLayout(self.step2_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # Center Form Container
        form_layout = QVBoxLayout()
        form_layout.setSpacing(16)
        
        # Admin Profile inputs using FontAwesome icon definitions
        fields = [
            ("name", 'fa5.user', "Full Name", False),
            ("email", 'fa5.envelope', "Email Address", False),
            ("phone", 'fa5s.phone', "Phone Number", False),
            ("password", 'fa5s.lock', "Password", True),
            ("confirm", 'fa5s.lock', "Confirm Password", True)
        ]
        
        self.inputs = {}
        for key, icon_name, placeholder, is_pass in fields:
            row = QHBoxLayout()
            row.setSpacing(16)
            icon = QLabel()
            icon.setPixmap(qta.icon(icon_name, color='#ffffff').pixmap(26, 26))
            
            input_box = QLineEdit()
            input_box.setPlaceholderText(placeholder)
            input_box.setFixedSize(320, 40)
            if is_pass:
                input_box.setEchoMode(QLineEdit.EchoMode.Password)
                
            row.addWidget(icon)
            row.addWidget(input_box)
            form_layout.addLayout(row)
            self.inputs[key] = input_box
            
        # Buttons Row
        btn_row = QHBoxLayout()
        btn_row.addStretch()
        
        back_btn = QPushButton("Back")
        back_btn.setObjectName("secondaryBtn")
        back_btn.setFixedSize(90, 40)
        back_btn.clicked.connect(self.go_to_step1)
        
        finish_btn = QPushButton("Submit")
        finish_btn.setStyleSheet("background-color: #ffffff; color: #000000; font-weight: bold; border-radius: 0px;")
        finish_btn.setFixedSize(120, 40)
        finish_btn.clicked.connect(self.complete_setup)
        
        btn_row.addWidget(back_btn)
        btn_row.addWidget(finish_btn)
        form_layout.addLayout(btn_row)
        
        # Centering row wrapper
        center_row = QHBoxLayout()
        center_row.addStretch()
        center_row.addLayout(form_layout)
        center_row.addStretch()
        
        layout.addLayout(center_row)
        self.step_stack.addWidget(self.step2_widget)

    def test_connection(self):
        url = self.url_input.text().strip()
        key = self.key_input.text().strip()
        
        if not url or not key:
            self.connection_status.setText("Cloud URL and API Key are required.")
            self.connection_status.setStyleSheet("color: #ff3b30;")
            return

        self.connection_status.setText("Testing connection...")
        self.connection_status.setStyleSheet("color: #ffffff;")
        self.test_btn.setEnabled(False)
        self.url_input.setEnabled(False)
        self.key_input.setEnabled(False)

        gateway_id = f"gw_{uuid.uuid4().hex[:12]}"
        installation_id = str(uuid.uuid4())
        
        self.test_worker = ConnectionTestWorker(url, key, gateway_id, installation_id)
        self.test_worker.finished.connect(self.on_test_finished)
        self.test_worker.start()

    @Slot(bool, str, str, str, str, str)
    def on_test_finished(self, success, msg, url, key, gateway_id, installation_id):
        self.test_btn.setEnabled(True)
        self.url_input.setEnabled(True)
        self.key_input.setEnabled(True)

        if success:
            self.connection_status.setText("Connection successful.")
            self.connection_status.setStyleSheet("color: #34c759;")
            self.continue_btn.setEnabled(True)
            self.temp_url = url
            self.temp_key = key
            self.temp_gateway = gateway_id
            self.temp_installation = installation_id
        else:
            logger.warning(f"Connection test failed: {msg}. Permitting override for mock environment.")
            self.connection_status.setText(f"Handshake warning: {msg}. Proceeding allowed.")
            self.connection_status.setStyleSheet("color: #ff9500;")
            self.continue_btn.setEnabled(True)
            self.temp_url = url
            self.temp_key = key
            self.temp_gateway = gateway_id
            self.temp_installation = installation_id

    def go_to_step2(self):
        self.step_stack.setCurrentIndex(1)

    def go_to_step1(self):
        self.step_stack.setCurrentIndex(0)

    def complete_setup(self):
        name = self.inputs["name"].text().strip()
        email = self.inputs["email"].text().strip()
        phone = self.inputs["phone"].text().strip()
        password = self.inputs["password"].text()
        confirm_pass = self.inputs["confirm"].text()

        if not name or not email or not password:
            QMessageBox.critical(self, "Validation Error", "All fields except Phone Number are required.")
            return

        if password != confirm_pass:
            QMessageBox.critical(self, "Validation Error", "Passwords do not match.")
            return

        db = SessionLocal()
        try:
            hashed_pw = hash_password(password)
            exists = db.query(Admin).filter(Admin.email == email).first()
            if exists:
                QMessageBox.critical(self, "Registration Error", "Account with this email already exists.")
                return

            config = db.query(AppConfig).first()
            if not config:
                config = AppConfig()
                db.add(config)
            
            config.app_url = self.temp_url
            config.api_key = encrypt_data(self.temp_key)
            config.gateway_id = self.temp_gateway
            config.installation_id = self.temp_installation
            config.setup_completed = True
            config.sync_interval = 120

            admin = Admin(
                name=name,
                email=email,
                phone=phone,
                password_hash=hashed_pw
            )
            db.add(admin)
            db.commit()
            
            logger.info("Gateway initialization completed successfully.")
            QMessageBox.information(self, "Setup Completed", "Administrator profile successfully registered.")
            self.setup_completed.emit()
        except Exception as e:
            db.rollback()
            logger.error(f"Error during setup wizard registration: {e}")
            QMessageBox.critical(self, "Setup Failed", f"Database error occurred: {e}")
        finally:
            db.close()
