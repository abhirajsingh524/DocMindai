import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # Security
    SECRET_KEY: str = "docmind-super-secret-jwt-key-for-local-development-32b"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
    
    # Database & Storage
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR}/docmind.db"
    STORAGE_DIR: str = str(BASE_DIR / "data" / "storage")
    INDEX_DIR: str = str(BASE_DIR / "data" / "indices")
    MAX_FILE_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB
    
    # LLM Settings (APINEX)
    LLM_PROVIDER: str = "apinex"
    APINEX_BASE_URL: str = "https://api.apinex.bond/v1"
    APINEX_MODEL: str = "free/glm-5.3-flash"
    APINEX_API_KEY: str = ""
    
    # Retrieval Settings
    EMBEDDING_PROVIDER: str = "local"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384
    TOP_K_CANDIDATES: int = 15
    FINAL_PASSAGES_COUNT: int = 6
    SIMILARITY_THRESHOLD: float = 0.05
    
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist
Path(settings.STORAGE_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.INDEX_DIR).mkdir(parents=True, exist_ok=True)
