from datetime import datetime

from pydantic import BaseModel, Field


class FuelCreate(BaseModel):
    vehicle_id: str
    fuel_date: datetime
    fuel_type: str = Field(min_length=1, max_length=30)
    quantity: float = Field(gt=0)
    cost_per_unit: float = Field(ge=0)
    total_cost: float = Field(ge=0)
    odometer_reading: float = Field(ge=0)


class FuelUpdate(BaseModel):
    vehicle_id: str
    fuel_date: datetime
    fuel_type: str = Field(min_length=1, max_length=30)
    quantity: float = Field(gt=0)
    cost_per_unit: float = Field(ge=0)
    total_cost: float = Field(ge=0)
    odometer_reading: float = Field(ge=0)


class FuelResponse(BaseModel):
    fuel_id: int
    vehicle_id: str
    fuel_date: datetime
    fuel_type: str
    quantity: float
    cost_per_unit: float
    total_cost: float
    odometer_reading: float