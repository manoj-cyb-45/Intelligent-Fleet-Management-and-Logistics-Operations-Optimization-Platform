from pydantic import BaseModel, Field


class VehicleCreate(BaseModel):
    vehicle_id: str = Field(min_length=3, max_length=20)
    registration_number: str = Field(min_length=1, max_length=20)
    vehicle_type: str = Field(min_length=1, max_length=50)
    capacity: float = Field(gt=0)
    fuel_type: str = Field(min_length=1, max_length=30)
    current_location: str | None = None
    fuel_level: float | None = Field(default=None, ge=0, le=100)
    mileage: float | None = Field(default=None, ge=0)


class VehicleResponse(BaseModel):
    vehicle_id: str
    registration_number: str
    vehicle_type: str
    capacity: float
    fuel_type: str
    current_status: str
    current_location: str | None
    fuel_level: float | None
    mileage: float | None