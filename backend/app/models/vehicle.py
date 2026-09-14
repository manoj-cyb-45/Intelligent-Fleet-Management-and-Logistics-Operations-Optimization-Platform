from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    vehicle_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    registration_number: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False
    )
    vehicle_type: Mapped[str] = mapped_column(String(50), nullable=False)
    capacity: Mapped[float] = mapped_column(Float, nullable=False)
    fuel_type: Mapped[str] = mapped_column(String(30), nullable=False)
    current_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="AVAILABLE"
    )
    current_location: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    fuel_level: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    mileage: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )