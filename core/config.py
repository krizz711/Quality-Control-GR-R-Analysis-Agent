from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str = "postgresql+asyncpg://postgres@localhost:5432/arad_quality"

    # Kafka
    kafka_bootstrap_servers: str = "localhost:9092"

    # MLflow
    mlflow_tracking_uri: str = "http://localhost:5000"

    # Gemini
    gemini_api_key: str = "test-key"

    # Alerts
    slack_webhook_url: str = ""

    # JIRA (optional)
    jira_url: str = ""
    jira_email: str = ""
    jira_api_token: str = ""
    jira_project_key: str = "QUAL"

    # App
    environment: str = "development"
    log_level: str = "INFO"
    api_auth_key: str = "arad-secret-key"


# Singleton — import this everywhere
settings = Settings()
