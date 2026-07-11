# Reusable theme variables and QSS stylesheet for the TS-Biomatrics pure black-and-white theme.

QSS_THEME = """
QMainWindow, QDialog, QMessageBox, QStackedWidget, QScrollArea {
    background-color: #000000;
}
QWidget {
    font-family: 'Inter', 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 13px;
}
QMessageBox QLabel {
    color: #ffffff;
    background-color: transparent;
}
QMessageBox QPushButton {
    background-color: #ffffff;
    border: none;
    border-radius: 0px;
    padding: 8px 20px;
    color: #000000;
    font-weight: bold;
}
QMessageBox QPushButton:hover {
    background-color: #e4e4e7;
}
QLabel {
    color: #ffffff;
    background-color: transparent;
}
QLabel#titleLabel {
    font-size: 22px;
    font-weight: bold;
    color: #ffffff;
}
QLabel#subtitleLabel {
    font-size: 13px;
    color: #888888;
}
QLabel#sectionTitle {
    font-size: 16px;
    font-weight: bold;
    color: #ffffff;
}
QLabel#iconLabel {
    font-size: 22px;
    color: #ffffff;
    background-color: transparent;
}
QPushButton, QWidget QPushButton {
    background-color: #ffffff;
    border: none;
    border-radius: 0px;
    padding: 10px 24px;
    color: #000000;
    font-weight: bold;
    font-size: 13px;
}
QPushButton:hover, QWidget QPushButton:hover {
    background-color: #e4e4e7;
}
QPushButton:pressed, QWidget QPushButton:pressed {
    background-color: #a1a1aa;
}
QPushButton:disabled, QWidget QPushButton:disabled {
    background-color: #333333;
    color: #888888;
}
QPushButton#secondaryBtn, QWidget QPushButton#secondaryBtn {
    background-color: transparent;
    border: 1px solid #ffffff;
    color: #ffffff;
}
QPushButton#secondaryBtn:hover, QWidget QPushButton#secondaryBtn:hover {
    background-color: #222222;
}
QPushButton#tabBtn, QWidget QPushButton#tabBtn {
    background-color: transparent;
    border: none;
    color: #888888;
    padding: 12px 20px;
    font-size: 14px;
}
QPushButton#tabBtn:hover, QWidget QPushButton#tabBtn:hover {
    color: #ffffff;
}
QPushButton#tabBtn:checked, QWidget QPushButton#tabBtn:checked {
    color: #ffffff;
    font-weight: bold;
}
QLineEdit, QComboBox, QSpinBox, QWidget QLineEdit, QWidget QComboBox, QWidget QSpinBox {
    background-color: #000000;
    border: 1px solid #ffffff;
    border-radius: 0px;
    padding: 10px 14px;
    color: #ffffff;
    font-size: 13px;
}
QLineEdit:focus, QComboBox:focus, QSpinBox:focus, 
QWidget QLineEdit:focus, QWidget QComboBox:focus, QWidget QSpinBox:focus {
    border: 1px solid #ffffff;
}
QFrame#card {
    background-color: #000000;
    border: 1px solid #333333;
    border-radius: 0px;
}
QTableWidget {
    background-color: #000000;
    gridline-color: #222222;
    border: 1px solid #222222;
    color: #ffffff;
    alternate-background-color: #000000;
}
QTableWidget::item {
    padding: 8px;
    border-bottom: 1px solid #111111;
}
QTableWidget::item:selected {
    background-color: #222222;
    color: #ffffff;
}
QHeaderView::section {
    background-color: #111111;
    color: #888888;
    padding: 8px;
    font-weight: bold;
    border: none;
    border-bottom: 1px solid #222222;
}
QScrollBar:vertical {
    background: #000000;
    width: 8px;
    margin: 0px;
}
QScrollBar::handle:vertical {
    background: #333333;
    min-height: 20px;
}
QScrollBar::handle:vertical:hover {
    background: #555555;
}
QProgressBar {
    border: 1px solid #333333;
    border-radius: 0px;
    text-align: center;
    background-color: #000000;
    color: #ffffff;
}
QProgressBar::chunk {
    background-color: #ffffff;
}
QScrollArea {
    border: none;
}
"""
