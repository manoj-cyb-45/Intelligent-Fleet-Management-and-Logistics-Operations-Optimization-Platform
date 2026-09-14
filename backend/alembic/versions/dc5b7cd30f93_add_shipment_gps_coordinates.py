"""add shipment gps coordinates

Revision ID: dc5b7cd30f93
Revises: d96c2c99e126
Create Date: 2026-09-02 19:54:43.963611

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "dc5b7cd30f93"
down_revision: Union[str, Sequence[str], None] = "d96c2c99e126"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add GPS coordinates to shipments."""
    op.add_column(
        "shipments",
        sa.Column(
            "latitude",
            sa.Float(),
            nullable=True,
        ),
    )

    op.add_column(
        "shipments",
        sa.Column(
            "longitude",
            sa.Float(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove GPS coordinates from shipments."""
    op.drop_column("shipments", "longitude")
    op.drop_column("shipments", "latitude")