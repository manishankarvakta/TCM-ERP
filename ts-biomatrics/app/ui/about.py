from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel, QFrame, QSizePolicy
from PySide6.QtCore import Qt
from app.core.config import APP_VERSION, DATABASE_VERSION, GATEWAY_PROTOCOL_VERSION

class AboutView(QWidget):
    """
    About Screen showing application metadata and capabilities lists.
    """
    def __init__(self, parent=None):
        super().__init__(parent)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(20)

        # Header Title
        title_label = QLabel("About Application")
        title_label.setObjectName("sectionTitle")
        layout.addWidget(title_label)

        # About Card
        card = QFrame()
        card.setObjectName("card")
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(24, 24, 24, 24)
        card_layout.setSpacing(16)

        # Brand Title
        brand = QLabel("TS-Biomatrics Gateway")
        brand.setObjectName("titleLabel")
        card_layout.addWidget(brand)

        # Detailed Description
        desc = QLabel(
            "TS-Biomatrics is a secure local biometric device gateway developed to connect "
            "local biometric attendance devices with cloud-based ERP, HRM, attendance, and "
            "payroll systems.\n\n"
            "The application operates inside the organization's local network and communicates "
            "directly with supported biometric devices through technologies such as TCP/IP, "
            "device APIs, and vendor-supported communication protocols."
        )
        desc.setWordWrap(True)
        desc.setStyleSheet("color: #a1a1aa; line-height: 1.6; font-size: 13px;")
        card_layout.addWidget(desc)

        # Version Info Block
        version_block = QLabel(
            f"<b>Application Version:</b> {APP_VERSION}<br>"
            f"<b>Gateway Protocol Version:</b> {GATEWAY_PROTOCOL_VERSION}<br>"
            f"<b>Database Version:</b> {DATABASE_VERSION}<br>"
            f"<b>Developer:</b> TechSoul<br>"
            f"<b>Category:</b> Biometric Integration & Attendance Gateway"
        )
        version_block.setStyleSheet("line-height: 1.6; color: #f4f4f5;")
        card_layout.addWidget(version_block)

        # Capabilities Bullet Points
        caps_label = QLabel(
            "<b>Core Capabilities:</b><br>"
            "• Local biometric device connectivity<br>"
            "• Multi-brand biometric device architecture<br>"
            "• TCP/IP device communication<br>"
            "• Cloud API connectivity<br>"
            "• Local offline database caching<br>"
            "• Automatic background data synchronization<br>"
            "• Manual sync override operations<br>"
            "• Employee and biometric user mapping<br>"
            "• Device health and status monitoring<br>"
            "• Automatic retry and offline queue<br>"
            "• Secure local administrator password hashing"
        )
        caps_label.setStyleSheet("line-height: 1.6; color: #a1a1aa;")
        card_layout.addWidget(caps_label)

        # Copyright
        copyright_lbl = QLabel("© TechSoul. All rights reserved.")
        copyright_lbl.setStyleSheet("color: #71717a; font-size: 11px; margin-top: 10px;")
        card_layout.addWidget(copyright_lbl)

        layout.addWidget(card)
        
        # Spacer
        spacer = QWidget()
        spacer.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        layout.addWidget(spacer)
