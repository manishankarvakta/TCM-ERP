import datetime
import shutil
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QFormLayout, 
    QLineEdit, QLabel, QFrame, QMessageBox, QFileDialog, QScrollArea
)
from PySide6.QtCore import Slot, Qt, Signal
from app.database.database import SessionLocal
from app.database.models import AppConfig, Admin
from app.core.security import encrypt_data, decrypt_data, hash_password, verify_password
from app.core.config import DEFAULT_DB_PATH, BACKUPS_DIR
from app.core.scheduler import reschedule_sync_job
from app.core.logger import get_logger

logger = get_logger("Settings UI")

class SettingsView(QWidget):
    """
    Settings View loaded directly as the Settings bottom tab.
    Designed with a high-contrast pure-black minimal theme.
    """
    config_saved = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet("background-color: #000000;")
        
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 20, 0, 20)
        main_layout.setSpacing(20)

        # Title
        title_lbl = QLabel("Settings")
        title_lbl.setStyleSheet("font-size: 20px; font-weight: bold; color: #ffffff;")
        main_layout.addWidget(title_lbl)

        # Scroll Area for settings blocks
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { background-color: #000000; border: none; }")
        
        self.scroll_content = QWidget()
        self.scroll_content.setStyleSheet("background-color: #000000;")
        self.scroll_layout = QVBoxLayout(self.scroll_content)
        self.scroll_layout.setContentsMargins(0, 0, 0, 0)
        self.scroll_layout.setSpacing(24)

        # Build Card Sections
        self.setup_cloud_config_card()
        self.setup_sync_settings_card()
        self.setup_account_settings_card()
        self.setup_database_card()

        scroll.setWidget(self.scroll_content)
        main_layout.addWidget(scroll)

        self.load_settings()

    def setup_cloud_config_card(self):
        card = QFrame()
        card.setObjectName("card")
        layout = QVBoxLayout(card)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)

        title = QLabel("Cloud Configuration")
        title.setObjectName("sectionTitle")
        layout.addWidget(title)

        form = QFormLayout()
        form.setSpacing(12)

        self.url_input = QLineEdit()
        self.key_input = QLineEdit()
        self.key_input.setEchoMode(QLineEdit.EchoMode.Password)

        form.addRow("App Server URL:", self.url_input)
        form.addRow("API Authorization Key:", self.key_input)
        layout.addLayout(form)

        btn_layout = QHBoxLayout()
        self.save_cloud_btn = QPushButton("Save Cloud Config")
        self.save_cloud_btn.setFixedSize(160, 36)
        self.save_cloud_btn.clicked.connect(self.save_cloud_config)
        btn_layout.addWidget(self.save_cloud_btn)
        btn_layout.addStretch()
        layout.addLayout(btn_layout)

        self.scroll_layout.addWidget(card)

    def setup_sync_settings_card(self):
        card = QFrame()
        card.setObjectName("card")
        layout = QVBoxLayout(card)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)

        title = QLabel("Synchronization Intervals")
        title.setObjectName("sectionTitle")
        layout.addWidget(title)

        form = QFormLayout()
        form.setSpacing(12)

        self.sync_sec_input = QLineEdit()
        self.sync_sec_input.setPlaceholderText("120")
        
        self.heartbeat_lbl = QLabel("30 seconds (Default)")
        self.status_lbl = QLabel("30 seconds (Default)")
        self.mapping_lbl = QLabel("300 seconds (5 minutes)")

        form.addRow("Biometric Sync (Seconds):", self.sync_sec_input)
        form.addRow("Gateway Heartbeat:", self.heartbeat_lbl)
        form.addRow("Device Status Polling:", self.status_lbl)
        form.addRow("User Mappings Refresh:", self.mapping_lbl)
        layout.addLayout(form)

        btn_layout = QHBoxLayout()
        self.save_sync_btn = QPushButton("Update Intervals")
        self.save_sync_btn.setFixedSize(160, 36)
        self.save_sync_btn.clicked.connect(self.save_sync_settings)
        btn_layout.addWidget(self.save_sync_btn)
        btn_layout.addStretch()
        layout.addLayout(btn_layout)

        self.scroll_layout.addWidget(card)

    def setup_account_settings_card(self):
        card = QFrame()
        card.setObjectName("card")
        layout = QVBoxLayout(card)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)

        title = QLabel("Local Administrator Details")
        title.setObjectName("sectionTitle")
        layout.addWidget(title)

        form = QFormLayout()
        form.setSpacing(12)

        self.name_input = QLineEdit()
        self.email_input = QLineEdit()
        self.phone_input = QLineEdit()
        
        self.old_pass_input = QLineEdit()
        self.old_pass_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.old_pass_input.setPlaceholderText("Verify Current Password")
        
        self.new_pass_input = QLineEdit()
        self.new_pass_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.new_pass_input.setPlaceholderText("New Password")

        form.addRow("Name:", self.name_input)
        form.addRow("Email:", self.email_input)
        form.addRow("Phone:", self.phone_input)
        form.addRow("Current Password:", self.old_pass_input)
        form.addRow("New Password:", self.new_pass_input)
        layout.addLayout(form)

        btn_layout = QHBoxLayout()
        self.save_account_btn = QPushButton("Save Profile")
        self.save_account_btn.setFixedSize(140, 36)
        self.save_account_btn.clicked.connect(self.save_account_settings)
        btn_layout.addWidget(self.save_account_btn)
        btn_layout.addStretch()
        layout.addLayout(btn_layout)

        self.scroll_layout.addWidget(card)

    def setup_database_card(self):
        card = QFrame()
        card.setObjectName("card")
        layout = QVBoxLayout(card)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)

        title = QLabel("Database Settings")
        title.setObjectName("sectionTitle")
        layout.addWidget(title)

        self.path_lbl = QLabel(f"Location: {DEFAULT_DB_PATH}")
        self.path_lbl.setWordWrap(True)
        self.path_lbl.setStyleSheet("color: #888888; font-family: monospace; font-size: 11px;")
        layout.addWidget(self.path_lbl)

        btn_layout = QHBoxLayout()
        self.backup_btn = QPushButton("Backup DB")
        self.backup_btn.setFixedSize(120, 36)
        self.backup_btn.clicked.connect(self.backup_db)
        btn_layout.addWidget(self.backup_btn)

        self.restore_btn = QPushButton("Restore DB")
        self.restore_btn.setObjectName("secondaryBtn")
        self.restore_btn.setFixedSize(120, 36)
        self.restore_btn.clicked.connect(self.restore_db)
        btn_layout.addWidget(self.restore_btn)
        btn_layout.addStretch()
        layout.addLayout(btn_layout)

        self.scroll_layout.addWidget(card)

    def load_settings(self):
        db = SessionLocal()
        try:
            config = db.query(AppConfig).first()
            if config:
                self.url_input.setText(config.app_url)
                self.key_input.setText(decrypt_data(config.api_key))
                self.sync_sec_input.setText(str(config.sync_interval))

            admin = db.query(Admin).first()
            if admin:
                self.name_input.setText(admin.name)
                self.email_input.setText(admin.email)
                self.phone_input.setText(admin.phone or "")
        except Exception as e:
            logger.error(f"Failed to load settings from DB: {e}")
        finally:
            db.close()

    def save_cloud_config(self):
        url = self.url_input.text().strip()
        key = self.key_input.text().strip()

        if not url or not key:
            QMessageBox.critical(self, "Error", "Both Cloud URL and API Key are required.")
            return

        db = SessionLocal()
        try:
            config = db.query(AppConfig).first()
            if not config:
                config = AppConfig()
                db.add(config)
            
            config.app_url = url
            config.api_key = encrypt_data(key)
            db.commit()
            
            self.config_saved.emit()
            
            logger.info("Cloud ERP credentials updated from settings panel.")
            QMessageBox.information(self, "Success", "Cloud configuration successfully updated.")
        except Exception as e:
            db.rollback()
            QMessageBox.critical(self, "Error", f"Failed to save Cloud Config: {e}")
        finally:
            db.close()

    def save_sync_settings(self):
        sync_sec = self.sync_sec_input.text().strip()
        if not sync_sec.isdigit() or int(sync_sec) <= 5:
            QMessageBox.critical(self, "Error", "Sync interval must be a valid integer greater than 5 seconds.")
            return

        interval = int(sync_sec)
        db = SessionLocal()
        try:
            config = db.query(AppConfig).first()
            if not config:
                config = AppConfig()
                db.add(config)
            config.sync_interval = interval
            db.commit()

            reschedule_sync_job(interval)
            
            logger.info(f"Biometric sync interval changed to {interval} seconds.")
            QMessageBox.information(self, "Success", f"Sync interval successfully updated to {interval} seconds.")
        except Exception as e:
            db.rollback()
            QMessageBox.critical(self, "Error", f"Failed to save sync settings: {e}")
        finally:
            db.close()

    def save_account_settings(self):
        name = self.name_input.text().strip()
        email = self.email_input.text().strip()
        phone = self.phone_input.text().strip()
        old_pass = self.old_pass_input.text()
        new_pass = self.new_pass_input.text()

        if not name or not email:
            QMessageBox.critical(self, "Error", "Name and Email are required.")
            return

        db = SessionLocal()
        try:
            admin = db.query(Admin).first()
            if not admin:
                QMessageBox.critical(self, "Error", "Local administrator account not found.")
                db.close()
                return

            if new_pass:
                if not old_pass:
                    QMessageBox.critical(self, "Error", "Current Password verification is required to set a new password.")
                    db.close()
                    return
                if not verify_password(old_pass, admin.password_hash):
                    QMessageBox.critical(self, "Verification Failed", "Incorrect current password verification.")
                    db.close()
                    return
                admin.password_hash = hash_password(new_pass)

            admin.name = name
            admin.email = email
            admin.phone = phone
            db.commit()

            self.old_pass_input.clear()
            self.new_pass_input.clear()
            
            logger.info("Local administrator details updated.")
            QMessageBox.information(self, "Success", "Local administrator details successfully updated.")
        except Exception as e:
            db.rollback()
            QMessageBox.critical(self, "Error", f"Failed to update administrator settings: {e}")
        finally:
            db.close()

    def backup_db(self):
        now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = BACKUPS_DIR / f"ts_biomatrics_backup_{now_str}.db"
        try:
            shutil.copy(str(DEFAULT_DB_PATH), str(backup_file))
            logger.info(f"Database backup created: {backup_file.name}")
            QMessageBox.information(self, "Backup Successful", f"Database backed up to:\n{backup_file}")
        except Exception as e:
            QMessageBox.critical(self, "Backup Failed", f"Failed to backup database: {e}")

    def restore_db(self):
        target_path, _ = QFileDialog.getOpenFileName(
            self, "Restore Database Backup", str(BACKUPS_DIR), "SQLite DB Files (*.db);;All Files (*)"
        )
        if not target_path:
            return

        reply = QMessageBox.question(
            self, "Confirm Restore",
            "Are you sure you want to restore the database?\n"
            "This will completely overwrite current data and close the application.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )

        if reply == QMessageBox.StandardButton.Yes:
            try:
                db = SessionLocal()
                db.close()
                shutil.copy(target_path, str(DEFAULT_DB_PATH))
                logger.info(f"Database successfully restored from backup {target_path}")
                QMessageBox.information(self, "Restore Successful", "Database restored. Application will now exit.")
                import sys
                sys.exit(0)
            except Exception as e:
                QMessageBox.critical(self, "Restore Failed", f"Failed to restore database: {e}")
