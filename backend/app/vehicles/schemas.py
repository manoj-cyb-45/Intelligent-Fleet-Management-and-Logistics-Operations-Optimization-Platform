from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class VehicleCreate(BaseModel):
    vehicle_id: str = Field(min_length=3, max_length=20)
    registration_number: str = Field(min_length=1, max_length=20)
    vehicle_type: str = Field(min_length=1, max_length=50)
    capacity: float = Field(gt=0)
    fuel_type: str = Field(min_length=1, max_length=30)

    fuel_tank_capacity: float = Field(gt=0)

    current_status: str = Field(
        default="AVAILABLE"
    )

    current_location: str | None = None
    fuel_level: float | None = Field(default=None, ge=0, le=100)
    mileage: float | None = Field(default=None, ge=0)

    driver_id: str | None = None

    @model_validator(mode="after")
    def validate_driver(self):
        if self.current_status in {"ASSIGNED", "IN_TRANSIT"}:
            if not self.driver_id:
                raise ValueError(
                    "driver_id is required when vehicle status is ASSIGNED or IN_TRANSIT"
                )

        return self


class VehicleResponse(BaseModel):
    vehicle_id: str
    registration_number: str
    vehicle_type: str
    capacity: float
    fuel_type: str
    fuel_tank_capacity: float
    current_status: str
    current_location: str | None
    fuel_level: float | None
    mileage: float | None
    latitude: float | None = None
    longitude: float | None = None
    gps_speed: float | None = None
    gps_heading: float | None = None
    gps_accuracy: float | None = None
    gps_altitude: float | None = None
    last_gps_update: datetime | None = None
    driver_id: str | None = None