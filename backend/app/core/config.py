import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://neondb_owner:npg_gkd5sjTZLO3M@ep-bitter-waterfall-axylk6j9-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"
    )

    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "workspace-production-secret-key"
    )

    FRONTEND_URL: str = os.getenv(
        "FRONTEND_URL",
        "http://localhost:3000"
    )

    OPENAI_API_KEY: str = os.getenv(
        "OPENAI_API_KEY",
        ""
    )

    DEFAULT_MODEL: str = "gpt-4o-mini"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()


