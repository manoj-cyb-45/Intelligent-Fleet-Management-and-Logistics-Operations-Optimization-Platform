from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class FuelRecord(Base):
    __tablename__ = "fuel_records"

    fuel_id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    vehicle_id: Mapped[str] = mapped_column(
        ForeignKey("vehicles.vehicle_id"),
        nullable=False,
    )

    fuel_date: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    fuel_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    quantity: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    cost_per_unit: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    total_cost: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    odometer_reading: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    