"""add shipment gps coordinates

Revision ID: af38ee33e8f7
Revises: ab768d1fbb2c
Create Date: 2026-09-15

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "af38ee33e8f7"
down_revision: Union[str, Sequence[str], None] = "ab768d1fbb2c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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
    op.drop_column(
        "shipments",
        "longitude",
    )

    op.drop_column(
        "shipments",
        "latitude",
    )