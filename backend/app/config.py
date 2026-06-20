"""Application settings loaded from environment variables / .env."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ directory (parent of app/).
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Runtime configuration.

    In local development ``database_url`` is left empty and we fall back to a
    file-backed SQLite database so the API runs with no external services.
    In production ``DATABASE_URL`` points at Neon Postgres.
    """

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = ""
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    environment: str = "development"

    @property
    def resolved_database_url(self) -> str:
        """Effective DB URL, defaulting to local SQLite when unset."""
        if self.database_url:
            return self.database_url
        return f"sqlite:///{BASE_DIR / 'venue.db'}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
