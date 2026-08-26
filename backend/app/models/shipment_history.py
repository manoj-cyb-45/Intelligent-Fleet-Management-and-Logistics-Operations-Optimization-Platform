from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class ShipmentHistory(Base):
    __tablename__ = "shipment_history"

    history_id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    shipment_id: Mapped[str] = mapped_column(
        ForeignKey("shipments.shipment_id"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    location: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    event_time: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )