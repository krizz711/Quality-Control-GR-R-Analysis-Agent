from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str

    # Kafka
    kafka_bootstrap_servers: str = "localhost:9092"

    # MLflow
    mlflow_tracking_uri: str = "http://localhost:5000"

    # Gemini
    gemini_api_key: str = ""

    # Alerts — Slack
    slack_webhook_url: str = ""

    # Alerts — Email (SMTP)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_address: str = ""
    alert_email_recipients: str = ""  # comma-separated

    # Alerts — SMS (generic webhook, e.g. Twilio/Vonage)
    sms_webhook_url: str = ""
    sms_auth_token: str = ""
    sms_from_number: str = ""
    sms_to_numbers: str = ""  # comma-separated

    # JIRA (optional)
    jira_url: str = ""
    jira_email: str = ""
    jira_api_token: str = ""
    jira_project_key: str = "QUAL"

    # App
    environment: str = "development"
    log_level: str = "INFO"
    api_auth_key: str
    frontend_url: str = ""
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    allow_mock_data: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if not self.is_production:
            return self

        if len(self.api_auth_key) < 32:
            raise ValueError("API_AUTH_KEY must be rotated to a strong secret in production")

        # Reject mock data early when running in production mode.
        if self.allow_mock_data:
            raise ValueError("ALLOW_MOCK_DATA must be false in production")

        if not self.frontend_url.strip():
            raise ValueError("FRONTEND_URL must be configured in production")

        if "*" in self.cors_origin_list:
            raise ValueError("CORS_ORIGINS must not contain '*' in production")

        return self


# Singleton — import this everywhere
settings = Settings()
