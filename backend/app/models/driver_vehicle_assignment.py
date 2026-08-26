from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class DriverVehicleAssignment(Base):
    __tablename__ = "driver_vehicle_assignments"

    assignment_id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    driver_id: Mapped[str] = mapped_column(
        ForeignKey("users.user_id"),
        nullable=False,
    )

    vehicle_id: Mapped[str] = mapped_column(
        ForeignKey("vehicles.vehicle_id"),
        nullable=False,
    )

    start_date: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    end_date: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="ACTIVE",
    )