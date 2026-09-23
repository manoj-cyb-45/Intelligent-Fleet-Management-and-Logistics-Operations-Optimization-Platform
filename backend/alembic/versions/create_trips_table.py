"""create trips table

Revision ID: c9a4b7e2d1f0
Revises: c8f2d9a1e4b3
"""

from alembic import op
import sqlalchemy as sa


revision = "c9a4b7e2d1f0"
down_revision = "c8f2d9a1e4b3"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "trips",
        sa.Column("trip_id", sa.String(length=20), nullable=False),
        sa.Column("shipment_id", sa.String(length=20), nullable=False),
        sa.Column("vehicle_id", sa.String(length=20), nullable=False),
        sa.Column("driver_id", sa.String(length=20), nullable=False),
        sa.Column("planned_departure", sa.DateTime(), nullable=False),
        sa.Column("planned_arrival", sa.DateTime(), nullable=False),
        sa.Column("actual_departure", sa.DateTime(), nullable=True),
        sa.Column("actual_arrival", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["shipment_id"],
            ["shipments.shipment_id"],
        ),
        sa.ForeignKeyConstraint(
            ["vehicle_id"],
            ["vehicles.vehicle_id"],
        ),
        sa.ForeignKeyConstraint(
            ["driver_id"],
            ["users.user_id"],
        ),
        sa.PrimaryKeyConstraint("trip_id"),
        sa.UniqueConstraint("shipment_id"),
        sa.UniqueConstraint(
            "vehicle_id",
            "planned_departure",
            "planned_arrival",
            name="uq_trip_vehicle_window",
        ),
    )


def downgrade():
    op.drop_table("trips")
