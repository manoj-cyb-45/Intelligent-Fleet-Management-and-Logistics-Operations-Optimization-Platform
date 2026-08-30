from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.database import get_db
from app.models import MaintenanceRecord, Vehicle
from app.maintenance.schemas import (
    MaintenanceCreate,
    MaintenanceResponse,
)


router = APIRouter(
    prefix="/maintenance",
    tags=["Maintenance"],
)


def build_maintenance_response(record: MaintenanceRecord):
    return MaintenanceResponse(
        maintenance_id=record.maintenance_id,
        vehicle_id=record.vehicle_id,
        maintenance_type=record.maintenance_type,
        description=record.description,
        maintenance_date=record.maintenance_date,
        due_date=record.due_date,
        cost=record.cost,
        status=record.status,
    )


@router.post(
    "",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_maintenance(
    maintenance_data: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
        )
    ),
):
    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id == maintenance_data.vehicle_id
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    allowed_statuses = {
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
    }

    if maintenance_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid maintenance status",
        )

    record = MaintenanceRecord(
        vehicle_id=maintenance_data.vehicle_id,
        maintenance_type=maintenance_data.maintenance_type,
        description=maintenance_data.description,
        maintenance_date=maintenance_data.maintenance_date,
        due_date=maintenance_data.due_date,
        cost=maintenance_data.cost,
        status=maintenance_data.status,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return build_maintenance_response(record)


@router.get(
    "",
    response_model=list[MaintenanceResponse],
)
def list_maintenance(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):
    records = (
        db.query(MaintenanceRecord)
        .order_by(
            MaintenanceRecord.maintenance_date.desc()
        )
        .all()
    )

    return [
        build_maintenance_response(record)
        for record in records
    ]


@router.get(
    "/{maintenance_id}",
    response_model=MaintenanceResponse,
)
def get_maintenance(
    maintenance_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):
    record = (
        db.query(MaintenanceRecord)
        .filter(
            MaintenanceRecord.maintenance_id
            == maintenance_id
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance record not found",
        )

    return build_maintenance_response(record)


@router.put(
    "/{maintenance_id}",
    response_model=MaintenanceResponse,
)
def update_maintenance(
    maintenance_id: int,
    maintenance_data: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
        )
    ),
):
    record = (
        db.query(MaintenanceRecord)
        .filter(
            MaintenanceRecord.maintenance_id
            == maintenance_id
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance record not found",
        )

    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id == maintenance_data.vehicle_id
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    allowed_statuses = {
        "SCHEDULED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
    }

    if maintenance_data.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid maintenance status",
        )

    record.vehicle_id = maintenance_data.vehicle_id
    record.maintenance_type = maintenance_data.maintenance_type
    record.description = maintenance_data.description
    record.maintenance_date = maintenance_data.maintenance_date
    record.due_date = maintenance_data.due_date
    record.cost = maintenance_data.cost
    record.status = maintenance_data.status

    db.commit()
    db.refresh(record)

    return build_maintenance_response(record)