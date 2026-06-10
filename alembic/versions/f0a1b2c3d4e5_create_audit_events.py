"""create audit_events table

Revision ID: f0a1b2c3d4e5
Revises: 2b2656005ada
Create Date: 2026-06-01 16:40:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f0a1b2c3d4e5'
down_revision = '2b2656005ada'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_events (
            id UUID NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            actor VARCHAR(128),
            user_id VARCHAR(128),
            event_type VARCHAR(128) NOT NULL,
            component VARCHAR(128),
            input_hash VARCHAR(128),
            algorithm_version VARCHAR(64),
            result_summary JSON,
            metadata JSON,
            ip_address VARCHAR(64),
            PRIMARY KEY (id, created_at)
        )
        """
    )
    op.execute(
        "SELECT create_hypertable('audit_events', 'created_at', if_not_exists => TRUE, migrate_data => TRUE)"
    )
    op.execute(
        "SELECT add_retention_policy('audit_events', INTERVAL '7 years', if_not_exists => TRUE)"
    )


def downgrade() -> None:
    op.execute(
        """
        SELECT remove_retention_policy('audit_events', if_exists => TRUE)
        """
    )
    op.drop_table('audit_events')
