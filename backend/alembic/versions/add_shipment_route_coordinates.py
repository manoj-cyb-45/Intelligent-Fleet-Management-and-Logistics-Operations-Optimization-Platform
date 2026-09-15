"""add shipment origin and destination coordinates

Revision ID: b7e91c42a6d1
Revises: af38ee33e8f7
Create Date: 2026-09-16
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b7e91c42a6d1"
down_revision = "af38ee33e8f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "shipments",
        sa.Column(
            "origin_latitude",
            sa.Float(),
            nullable=True,
        ),
    )

    op.add_column(
        "shipments",
        sa.Column(
            "origin_longitude",
            sa.Float(),
            nullable=True,
        ),
    )

    op.add_column(
        "shipments",
        sa.Column(
            "destination_latitude",
            sa.Float(),
            nullable=True,
        ),
    )

    op.add_column(
        "shipments",
        sa.Column(
            "destination_longitude",
            sa.Float(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "shipments",
        "destination_longitude",
    )

    op.drop_column(
        "shipments",
        "destination_latitude",
    )

    op.drop_column(
        "shipments",
        "origin_longitude",
    )

    op.drop_column(
        "shipments",
        "origin_latitude",
    )