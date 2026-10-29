from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./mejaar.db"
    jwt_secret: str = "change-me-32-chars-min"
    jwt_access_ttl_minutes: int = 15
    jwt_refresh_ttl_days: int = 14
    jwt_algorithm: str = "HS256"
    storage_backend: str = "local"
    storage_local_dir: str = "./storage"
    s3_bucket: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_endpoint: str = ""
    s3_public_base_url: str = ""
    assets_public_base: str = "http://localhost:8000/assets"
    cors_origins: str = "http://localhost:3000"
    rate_limit_public: str = "30/minute"
    rate_limit_login: str = "5/minute"


settings = Settings()
