from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    maintenance_id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    vehicle_id: Mapped[str] = mapped_column(
        ForeignKey("vehicles.vehicle_id"),
        nullable=False,
    )

    maintenance_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    maintenance_date: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    due_date: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    cost: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="SCHEDULED",
    )