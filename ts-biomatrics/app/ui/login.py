import datetime
import qtawesome as qta
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLineEdit, QPushButton, 
    QLabel, QMessageBox
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QPixmap
from app.database.database import SessionLocal
from app.database.models import Admin
from app.core.security import verify_password
from app.core.logger import get_logger

logger = get_logger("Login")

class LoginView(QWidget):
    """
    Login View designed with a high-contrast pure-black minimal theme and crisp vector icons.
    """
    login_successful = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet("background-color: #000000;")
        
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(40, 40, 40, 40)
        
        # 1. Top-Left Branding Block (Fingerprint & Brand Name)
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

        # 2. Centered Inputs Card Layout
        inputs_center_layout = QHBoxLayout()
        inputs_center_layout.addStretch()
        
        form_vertical_layout = QVBoxLayout()
        form_vertical_layout.setSpacing(24)
        
        # Row 1: Email Input
        email_row = QHBoxLayout()
        email_row.setSpacing(16)
        email_icon = QLabel()
        email_icon.setPixmap(qta.icon('fa5.envelope', color='#ffffff').pixmap(28, 28))
        self.email_input = QLineEdit()
        self.email_input.setPlaceholderText("Email")
        self.email_input.setFixedSize(320, 42)
        email_row.addWidget(email_icon)
        email_row.addWidget(self.email_input)
        
        # Row 2: Password Input
        pass_row = QHBoxLayout()
        pass_row.setSpacing(16)
        pass_icon = QLabel()
        pass_icon.setPixmap(qta.icon('fa5s.lock', color='#ffffff').pixmap(28, 28))
        self.pass_input = QLineEdit()
        self.pass_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.pass_input.setPlaceholderText("Password")
        self.pass_input.setFixedSize(320, 42)
        pass_row.addWidget(pass_icon)
        pass_row.addWidget(self.pass_input)
        
        form_vertical_layout.addLayout(email_row)
        form_vertical_layout.addLayout(pass_row)
        
        # Row 3: Login Button (Aligned to the right of inputs)
        btn_row = QHBoxLayout()
        btn_row.addStretch()
        login_btn = QPushButton("Login")
        login_btn.setStyleSheet("background-color: #ffffff; color: #000000; font-weight: bold; border-radius: 0px;")
        login_btn.setFixedSize(120, 42)
        login_btn.clicked.connect(self.handle_login)
        btn_row.addWidget(login_btn)
        
        form_vertical_layout.addLayout(btn_row)
        
        inputs_center_layout.addLayout(form_vertical_layout)
        inputs_center_layout.addStretch()
        
        main_layout.addLayout(inputs_center_layout)
        main_layout.addStretch()
        
        self.load_admin_details()

    def load_admin_details(self):
        db = SessionLocal()
        admin = db.query(Admin).first()
        if admin:
            self.email_input.setText(admin.email)
            self.pass_input.setFocus()
        db.close()

    def handle_login(self):
        email = self.email_input.text().strip()
        password = self.pass_input.text()

        if not email or not password:
            QMessageBox.critical(self, "Login Error", "Both email and password are required.")
            return

        db = SessionLocal()
        try:
            admin = db.query(Admin).filter(Admin.email == email).first()
            if not admin:
                QMessageBox.critical(self, "Access Denied", "Invalid administrator credentials.")
                return

            if verify_password(password, admin.password_hash):
                admin.last_login = datetime.datetime.utcnow()
                db.commit()
                
                logger.info(f"Admin '{admin.name}' logged in successfully.")
                self.login_successful.emit()
            else:
                QMessageBox.critical(self, "Access Denied", "Invalid administrator credentials.")
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            QMessageBox.critical(self, "Authentication Failed", f"Database error occurred: {e}")
        finally:
            db.close()
