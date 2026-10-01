"""add maintenance id to alerts

Revision ID: 816e4bb85faf
Revises: c9a4b7e2d1f0
Create Date: 2026-10-01 15:06:53.913753

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '816e4bb85faf'
down_revision: Union[str, Sequence[str], None] = 'c9a4b7e2d1f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column(
        "alerts",
        sa.Column(
            "maintenance_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_alerts_maintenance_id",
        "alerts",
        "maintenance_records",
        ["maintenance_id"],
        ["maintenance_id"],
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_constraint(
        "fk_alerts_maintenance_id",
        "alerts",
        type_="foreignkey",
    )

    op.drop_column(
        "alerts",
        "maintenance_id",
    )