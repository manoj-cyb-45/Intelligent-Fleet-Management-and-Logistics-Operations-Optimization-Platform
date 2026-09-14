from datetime import datetime

from pydantic import BaseModel, Field


class ShipmentCreate(BaseModel):
    description: str | None = None
    origin: str = Field(min_length=1, max_length=255)
    destination: str = Field(min_length=1, max_length=255)
    due_date: datetime
    vehicle_id: str = Field(min_length=3, max_length=20)
    driver_id: str = Field(min_length=3, max_length=20)


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
    scheduled_start_time: datetime | None = None
    started_at: datetime | None
    expected_delivery_at: datetime | None
    delivered_at: datetime | None
    vehicle_id: str
    driver_id: str
    created_at: datetime
    updated_at: datetime


class ShipmentUpdate(BaseModel):
    status: str | None = None
    current_location: str | None = None
    expected_delivery_at: datetime | None = None
    scheduled_start_time: datetime | None = None
    vehicle_id: str | None = None
    driver_id: str | None = None


class ShipmentHistoryResponse(BaseModel):
    history_id: int
    shipment_id: str
    status: str
    location: str
    event_time: datetime
    description: str | None


# =========================================================
# TRIP SCHEDULING SCHEMAS
# =========================================================

class TripScheduleCreate(BaseModel):
    origin: str = Field(min_length=1, max_length=255)
    destination: str = Field(min_length=1, max_length=255)
    scheduled_start_time: datetime
    expected_delivery_at: datetime
    vehicle_id: str = Field(min_length=3, max_length=20)
    driver_id: str = Field(min_length=3, max_length=20)
    description: str | None = None


class TripRescheduleRequest(BaseModel):
    scheduled_start_time: datetime | None = None
    expected_delivery_at: datetime | None = None
    vehicle_id: str | None = None
    driver_id: str | None = None


class TripStartRequest(BaseModel):
    current_location: str | None = None
    notes: str | None = None


class AvailabilityCheckRequest(BaseModel):
    scheduled_start_time: datetime
    expected_delivery_at: datetime
    vehicle_id: str | None = None
    driver_id: str | None = None
    exclude_shipment_id: str | None = None


class EntityAvailability(BaseModel):
    available: bool
    reason: str | None = None
    conflicting_shipment_id: str | None = None


class AvailabilityCheckResponse(BaseModel):
    available: bool
    vehicle: EntityAvailability | None = None
    driver: EntityAvailability | None = None
    available_vehicles: list[str] = []
    available_drivers: list[str] = []


class ConflictDetail(BaseModel):
    type: str
    entity: str
    entity_id: str
    conflicting_id: str | None = None
    message: str
