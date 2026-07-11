import logging
import sys
from datetime import datetime
from app.core.config import LOGS_DIR, DEFAULT_LOG_PATH

# Keep a thread-safe list of logs in memory for the UI to display
MAX_UI_LOGS = 1000
UI_LOG_RECORDS = []

class UIHandler(logging.Handler):
    """
    Custom logging handler that retains log records in memory for the UI.
    """
    def emit(self, record):
        try:
            log_entry = {
                "timestamp": datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S"),
                "level": record.levelname,
                "category": getattr(record, "category", "Application"),
                "message": record.getMessage(),
            }
            UI_LOG_RECORDS.append(log_entry)
            if len(UI_LOG_RECORDS) > MAX_UI_LOGS:
                UI_LOG_RECORDS.pop(0)
        except Exception:
            self.handleError(record)

# Configure Root Logger
logger = logging.getLogger("TS-Biomatrics")
logger.setLevel(logging.DEBUG)

# Formatters
formatter = logging.Formatter(
    '[%(asctime)s] %(levelname)s [%(category)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Console Handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(formatter)
# Attach default category attribute filter
class CategoryFilter(logging.Filter):
    def filter(self, record):
        if not hasattr(record, "category"):
            record.category = "Application"
        return True
console_handler.addFilter(CategoryFilter())
logger.addHandler(console_handler)

# File Handler
file_handler = logging.FileHandler(DEFAULT_LOG_PATH, encoding='utf-8')
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(formatter)
file_handler.addFilter(CategoryFilter())
logger.addHandler(file_handler)

# UI Handler
ui_handler = UIHandler()
ui_handler.setLevel(logging.DEBUG)
ui_handler.addFilter(CategoryFilter())
logger.addHandler(ui_handler)

def get_logger(category="Application"):
    """
    Helper to get logger pre-configured with a specific category.
    """
    return logging.LoggerAdapter(logger, {"category": category})
