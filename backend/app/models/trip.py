from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class Trip(Base):
    __tablename__ = "trips"

    trip_id: Mapped[str] = mapped_column(
        String(20),
        primary_key=True,
    )

    shipment_id: Mapped[str] = mapped_column(
        ForeignKey("shipments.shipment_id"),
        nullable=False,
        unique=True,
    )

    vehicle_id: Mapped[str] = mapped_column(
        ForeignKey("vehicles.vehicle_id"),
        nullable=False,
    )

    driver_id: Mapped[str] = mapped_column(
        ForeignKey("users.user_id"),
        nullable=False,
    )

    planned_departure: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    planned_arrival: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    actual_departure: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    actual_arrival: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="SCHEDULED",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        UniqueConstraint(
            "vehicle_id",
            "planned_departure",
            "planned_arrival",
            name="uq_trip_vehicle_window",
        ),
    )
