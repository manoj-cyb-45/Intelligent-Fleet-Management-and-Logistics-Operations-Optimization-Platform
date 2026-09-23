from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class TripCreate(BaseModel):
    shipment_id: str = Field(min_length=3, max_length=20)
    planned_departure: datetime
    planned_arrival: datetime

    @model_validator(mode="after")
    def validate_window(self):
        if self.planned_arrival <= self.planned_departure:
            raise ValueError(
                "Planned arrival must be later than planned departure."
            )
        return self


class TripUpdate(BaseModel):
    status: str | None = None
    planned_departure: datetime | None = None
    planned_arrival: datetime | None = None


class TripResponse(BaseModel):
    trip_id: str
    shipment_id: str
    vehicle_id: str
    driver_id: str
    planned_departure: datetime
    planned_arrival: datetime
    actual_departure: datetime | None
    actual_arrival: datetime | None
    status: str
    created_at: datetime
    updated_at: datetime
