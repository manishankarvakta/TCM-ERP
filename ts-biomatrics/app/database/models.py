import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base

class AppConfig(Base):
    __tablename__ = "app_config"
    
    id = Column(Integer, primary_key=True, index=True)
    app_url = Column(String, nullable=True)
    api_key = Column(String, nullable=True) # Encrypted
    gateway_id = Column(String, nullable=True)
    installation_id = Column(String, nullable=True)
    setup_completed = Column(Boolean, default=False)
    sync_interval = Column(Integer, default=120) # seconds
    last_successful_connection = Column(DateTime, nullable=True)
    app_version = Column(String, default="1.0.0")

class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

class BiometricDevice(Base):
    __tablename__ = "biometric_devices"
    
    id = Column(Integer, primary_key=True, index=True)
    cloud_device_id = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=False)
    vendor = Column(String, nullable=False) # e.g. "ZKTeco", "Hikvision", "Generic"
    model = Column(String, nullable=True)
    serial_number = Column(String, unique=True, index=True, nullable=True)
    firmware_version = Column(String, nullable=True)
    user_count = Column(Integer, default=0)
    log_count = Column(Integer, default=0)
    ip_address = Column(String, nullable=False)
    port = Column(Integer, default=4370)
    connection_type = Column(String, default="TCP/IP") # e.g. "TCP/IP", "HTTP", "HTTPS"
    status = Column(String, default="OFFLINE") # e.g. "ONLINE", "OFFLINE"
    last_connection = Column(DateTime, nullable=True)
    last_sync = Column(DateTime, nullable=True)
    is_enabled = Column(Boolean, default=True)

    mappings = relationship("UserMapping", back_populates="device", cascade="all, delete-orphan")
    logs = relationship("RawBiometricLog", back_populates="device", cascade="all, delete-orphan")

class UserMapping(Base):
    __tablename__ = "user_mappings"
    
    id = Column(Integer, primary_key=True, index=True)
    cloud_employee_id = Column(String, index=True, nullable=True)
    device_id = Column(Integer, ForeignKey("biometric_devices.id"), nullable=False)
    device_user_id = Column(String, index=True, nullable=False) # e.g. employeeNo or PIN on device
    employee_name = Column(String, nullable=True)
    mapping_status = Column(String, default="MAPPED") # e.g. "MAPPED", "UNMAPPED", "CONFLICT", "DISABLED"
    access_status = Column(String, default="ENABLED") # e.g. "ENABLED", "DISABLED"
    last_sync = Column(DateTime, nullable=True)

    device = relationship("BiometricDevice", back_populates="mappings")

class RawBiometricLog(Base):
    __tablename__ = "raw_biometric_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("biometric_devices.id"), nullable=False)
    device_user_id = Column(String, index=True, nullable=False)
    punch_time = Column(DateTime, index=True, nullable=False)
    verification_method = Column(String, default="1") # e.g. finger, card, face
    raw_payload = Column(Text, nullable=True) # JSON payload
    processing_status = Column(String, default="PENDING") # PENDING, COMPLETED, FAILED
    sync_status = Column(String, default="PENDING") # PENDING, SYNCED, FAILED
    retry_count = Column(Integer, default=0)

    device = relationship("BiometricDevice", back_populates="logs")

class SyncQueue(Base):
    __tablename__ = "sync_queue"
    
    id = Column(Integer, primary_key=True, index=True)
    operation_type = Column(String, nullable=False) # e.g. BIOMETRIC_SYNC, USER_MAPPING, HEARTBEAT
    payload = Column(Text, nullable=False) # JSON data
    status = Column(String, default="PENDING") # PENDING, IN_PROGRESS, FAILED
    retry_count = Column(Integer, default=0)
    last_attempt = Column(DateTime, nullable=True)
    next_retry = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

class SyncHistory(Base):
    __tablename__ = "sync_history"
    
    id = Column(Integer, primary_key=True, index=True)
    operation = Column(String, nullable=False)
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    success_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    status = Column(String, default="SUCCESS") # SUCCESS, PARTIAL, FAILED
    error_details = Column(Text, nullable=True)
