from datetime import datetime

from pydantic import BaseModel, Field


class MaintenanceCreate(BaseModel):
    vehicle_id: str
    maintenance_type: str = Field(min_length=1, max_length=50)
    description: str | None = None
    maintenance_date: datetime
    due_date: datetime | None = None
    cost: float = Field(default=0.0, ge=0)
    status: str = "SCHEDULED"


class MaintenanceResponse(BaseModel):
    maintenance_id: int
    vehicle_id: str
    maintenance_type: str
    description: str | None
    maintenance_date: datetime
    due_date: datetime | None
    cost: float
    status: str