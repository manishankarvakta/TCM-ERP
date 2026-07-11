from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, scoped_session
from app.core.config import DB_URL

# SQLAlchemy database engine
engine = create_engine(
    DB_URL, 
    connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
)

# Thread-safe Session factory
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

Base = declarative_base()

def init_db():
    """
    Initializes the local database schema.
    """
    import app.database.models as models # Import models to register them
    Base.metadata.create_all(bind=engine)
