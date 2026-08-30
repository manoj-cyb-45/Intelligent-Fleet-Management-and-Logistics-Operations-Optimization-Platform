from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.database import get_db
from app.models import FuelRecord, Vehicle
from app.fuel.schemas import (
    FuelCreate,
    FuelResponse,
    FuelUpdate,
)


router = APIRouter(
    prefix="/fuel",
    tags=["Fuel"],
)


def build_fuel_response(record: FuelRecord):
    return FuelResponse(
        fuel_id=record.fuel_id,
        vehicle_id=record.vehicle_id,
        fuel_date=record.fuel_date,
        fuel_type=record.fuel_type,
        quantity=record.quantity,
        cost_per_unit=record.cost_per_unit,
        total_cost=record.total_cost,
        odometer_reading=record.odometer_reading,
    )


@router.post(
    "",
    response_model=FuelResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_fuel_record(
    fuel_data: FuelCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):
    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id == fuel_data.vehicle_id
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    fuel_record = FuelRecord(
        vehicle_id=fuel_data.vehicle_id,
        fuel_date=fuel_data.fuel_date,
        fuel_type=fuel_data.fuel_type,
        quantity=fuel_data.quantity,
        cost_per_unit=fuel_data.cost_per_unit,
        total_cost=fuel_data.total_cost,
        odometer_reading=fuel_data.odometer_reading,
    )

    db.add(fuel_record)
    db.commit()
    db.refresh(fuel_record)

    return build_fuel_response(fuel_record)


@router.get(
    "",
    response_model=list[FuelResponse],
)
def list_fuel_records(
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
        db.query(FuelRecord)
        .order_by(FuelRecord.fuel_date.desc())
        .all()
    )

    return [
        build_fuel_response(record)
        for record in records
    ]


@router.get(
    "/{fuel_id}",
    response_model=FuelResponse,
)
def get_fuel_record(
    fuel_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):
    fuel_record = (
        db.query(FuelRecord)
        .filter(
            FuelRecord.fuel_id == fuel_id
        )
        .first()
    )

    if not fuel_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fuel record not found",
        )

    return build_fuel_response(fuel_record)


@router.put(
    "/{fuel_id}",
    response_model=FuelResponse,
)
def update_fuel_record(
    fuel_id: int,
    fuel_data: FuelUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):
    fuel_record = (
        db.query(FuelRecord)
        .filter(
            FuelRecord.fuel_id == fuel_id
        )
        .first()
    )

    if not fuel_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fuel record not found",
        )

    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id == fuel_data.vehicle_id
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    fuel_record.vehicle_id = fuel_data.vehicle_id
    fuel_record.fuel_date = fuel_data.fuel_date
    fuel_record.fuel_type = fuel_data.fuel_type
    fuel_record.quantity = fuel_data.quantity
    fuel_record.cost_per_unit = fuel_data.cost_per_unit
    fuel_record.total_cost = fuel_data.total_cost
    fuel_record.odometer_reading = (
        fuel_data.odometer_reading
    )

    db.commit()
    db.refresh(fuel_record)

    return build_fuel_response(fuel_record)