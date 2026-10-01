"""create notifications table

Revision ID: 54008601e592
Revises: 816e4bb85faf
Create Date: 2026-10-01 16:03:42.415557

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "54008601e592"
down_revision: Union[str, Sequence[str], None] = "816e4bb85faf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "notifications",
        sa.Column(
            "notification_id",
            sa.Integer(),
            primary_key=True,
            autoincrement=True,
        ),
        sa.Column(
            "user_id",
            sa.String(length=50),
            sa.ForeignKey("users.user_id"),
            nullable=False,
        ),
        sa.Column(
            "notification_type",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "title",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "message",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "is_read",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_table("notifications")