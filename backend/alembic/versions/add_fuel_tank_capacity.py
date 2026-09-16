"""add fuel tank capacity to vehicles

Revision ID: c8f2d9a1e4b3
Revises: b7e91c42a6d1
"""

from alembic import op
import sqlalchemy as sa


revision = "c8f2d9a1e4b3"
down_revision = "b7e91c42a6d1"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "vehicles",
        sa.Column(
            "fuel_tank_capacity",
            sa.Float(),
            nullable=True,
        ),
    )

    op.execute(
        "UPDATE vehicles "
        "SET fuel_tank_capacity = 120.0 "
        "WHERE fuel_tank_capacity IS NULL"
    )

    op.alter_column(
        "vehicles",
        "fuel_tank_capacity",
        existing_type=sa.Float(),
        nullable=False,
    )


def downgrade():
    op.drop_column("vehicles", "fuel_tank_capacity")
