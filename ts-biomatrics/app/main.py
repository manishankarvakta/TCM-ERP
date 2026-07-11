import sys
from pathlib import Path

# Add project root to sys.path to allow absolute imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PySide6.QtWidgets import QApplication
from app.database.database import init_db
from app.ui.main_window import MainWindow
from app.core.logger import get_logger

logger = get_logger("Application")

def main():
    logger.info("Initializing Database...")
    init_db()

    logger.info("Starting PySide6 GUI Application context...")
    app = QApplication(sys.argv)
    
    # Set application window icon globally
    from PySide6.QtGui import QIcon
    from app.core.config import BASE_DIR
    icon_path = BASE_DIR / "app" / "resources" / "images" / "AppIcon.png"
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))
        
    window = MainWindow()
    window.show()

    exit_code = app.exec()
    logger.info("Shutting down Application...")
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
