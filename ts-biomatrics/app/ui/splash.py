from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel, QGraphicsOpacityEffect
from PySide6.QtCore import Qt, QPropertyAnimation, QEasingCurve
from PySide6.QtGui import QPixmap

class SplashView(QWidget):
    """
    Minimal loading/splash view with a centered pulsating fingerprint logo.
    """
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet("background-color: #000000;")
        
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        from app.core.config import BASE_DIR
        self.logo_label = QLabel()
        logo_pix = QPixmap(str(BASE_DIR / "app" / "resources" / "images" / "fingerprint.png"))
        if not logo_pix.isNull():
            self.logo_label.setPixmap(logo_pix.scaled(150, 150, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))
        else:
            self.logo_label.setText("🔘")
            self.logo_label.setStyleSheet("font-size: 64px; color: #ffffff;")
            
        layout.addWidget(self.logo_label, alignment=Qt.AlignmentFlag.AlignCenter)
        
        # Opacity pulsating (blinking) animation
        self.opacity_effect = QGraphicsOpacityEffect(self.logo_label)
        self.logo_label.setGraphicsEffect(self.opacity_effect)
        
        self.anim = QPropertyAnimation(self.opacity_effect, b"opacity")
        self.anim.setDuration(1500) # 1.5 seconds cycle
        self.anim.setStartValue(1.0)
        self.anim.setKeyValueAt(0.5, 0.1) # almost faded out at midpoint
        self.anim.setEndValue(1.0)
        self.anim.setLoopCount(-1) # infinite looping
        self.anim.setEasingCurve(QEasingCurve.Type.InOutQuad)
        self.anim.start()
