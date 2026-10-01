from datetime import date

from pydantic import BaseModel, Field


class MaintenanceCreate(BaseModel):
    vehicle_id: str = Field(
        min_length=3,
        max_length=20,
    )

    maintenance_type: str = Field(
        min_length=1,
        max_length=50,
    )

    description: str | None = None

    maintenance_date: date

    due_date: date | None = None

    cost: float = Field(
        default=0.0,
        ge=0,
    )

    status: str = "SCHEDULED"


class MaintenanceResponse(BaseModel):
    maintenance_id: int

    vehicle_id: str

    maintenance_type: str

    description: str | None

    maintenance_date: date

    due_date: date | None

    cost: float

    status: str


# =========================================================
# MAINTENANCE REPORT
# =========================================================

class MaintenanceReportResponse(BaseModel):
    total_records: int
    scheduled: int
    in_progress: int
    completed: int
    cancelled: int
    upcoming: int
    overdue: int
    total_cost: float