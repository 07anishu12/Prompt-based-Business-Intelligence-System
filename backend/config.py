from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://bi_user:bi_pass@localhost:5432/prompt_bi"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Claude AI — no default, must be set in .env
    ANTHROPIC_API_KEY: str

    # JWT — no default, must be set in .env
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24

    # File Uploads
    UPLOAD_DIR: str = "./uploads"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
