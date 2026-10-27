import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = 5000
    DB_HOST: str = "db"
    DB_PORT: int = 5432

    DB_USER: str = "firms_user"
    DB_PASSWORD: str = "firms_password"
    DB_NAME: str = "firms_db"
    MAP_KEY: str = "6204663bf57fdce1c0a9fb533ed05e58" 

    @property
    def DATABASE_URL(self) -> str:
        env_url = os.getenv("DATABASE_URL")
        if env_url:
            return env_url
        return f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        env_url = os.getenv("ASYNC_DATABASE_URL")
        if env_url:
            return env_url
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
