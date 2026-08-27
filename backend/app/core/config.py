from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    DATABASE_URL: str = (
        "postgresql+asyncpg://workspace:"
        "workspace@localhost:5432/ai_collab"
    )

    SECRET_KEY: str = "change-this-in-production"

    FRONTEND_URL: str = "http://localhost:3000"

    OPENAI_API_KEY: str = ""

    DEFAULT_MODEL: str = "gpt-4o-mini"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()
