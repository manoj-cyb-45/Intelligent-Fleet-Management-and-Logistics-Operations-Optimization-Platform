from datetime import datetime

from pydantic import BaseModel, Field


class ShipmentCreate(BaseModel):
    description: str | None = None

    origin: str = Field(
        min_length=1,
        max_length=255,
    )

    destination: str = Field(
        min_length=1,
        max_length=255,
    )

    due_date: datetime

    vehicle_id: str = Field(
        min_length=3,
        max_length=20,
    )

    driver_id: str = Field(
        min_length=3,
        max_length=20,
    )

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )


class ShipmentResponse(BaseModel):
    shipment_id: str
    tracking_number: str
    description: str | None

    origin: str
    destination: str
    due_date: datetime

    status: str
    current_location: str | None
    delivery_progress: float

    started_at: datetime | None
    expected_delivery_at: datetime | None
    delivered_at: datetime | None

    vehicle_id: str
    driver_id: str

    latitude: float | None
    longitude: float | None

    created_at: datetime
    updated_at: datetime


class ShipmentUpdate(BaseModel):
    status: str | None = None

    current_location: str | None = None

    expected_delivery_at: datetime | None = None

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )


class ShipmentHistoryResponse(BaseModel):
    history_id: int
    shipment_id: str
    status: str
    location: str
    event_time: datetime
    description: str | None