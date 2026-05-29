import os
from dotenv import load_dotenv

# Load .env from root directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
load_dotenv(os.path.join(BASE_DIR, ".env"))

class Settings:
    PROJECT_NAME: str = "Pharma Premium AI API"
    PROJECT_VERSION: str = "1.0.0"
    
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY")
    
    # Database Configuration
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_NAME: str = os.getenv("DB_NAME", "pharma_db")
    
    @property
    def DATABASE_URL(self) -> str:
        from urllib.parse import quote_plus
        encoded_password = quote_plus(self.DB_PASSWORD)
        return f"mysql+pymysql://{self.DB_USER}:{encoded_password}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fallback-secret-key-for-dev")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # FAISS settings
    DATA_DIR: str = os.path.join(BASE_DIR, "backend", "data")
    INDEX_PATH: str = os.path.join(DATA_DIR, "faiss_index.idx")
    METADATA_PATH: str = os.path.join(DATA_DIR, "faiss_metadata.pkl")
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"

settings = Settings()
