from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.database import get_db
from app.models import (
    Vehicle,
    DriverVehicleAssignment,
    Shipment,
)
from app.vehicles.schemas import VehicleCreate, VehicleResponse


router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"],
)


ALLOWED_STATUSES = {
    "AVAILABLE",
    "ASSIGNED",
    "IN_TRANSIT",
    "MAINTENANCE",
    "RETIRED",
}


def get_active_assignment(
    db: Session,
    vehicle_id: str,
):
    return (
        db.query(DriverVehicleAssignment)
        .filter(
            DriverVehicleAssignment.vehicle_id == vehicle_id,
            DriverVehicleAssignment.status == "ACTIVE",
        )
        .first()
    )


@router.post(
    "",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_vehicle(
    vehicle_data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN", "MANAGER")
    ),
):
    if vehicle_data.current_status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid vehicle status",
        )

    # A newly created vehicle cannot have a driver assignment.
    if vehicle_data.current_status != "AVAILABLE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New vehicles must be created with AVAILABLE status",
        )

    existing_vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id == vehicle_data.vehicle_id
        )
        .first()
    )

    if existing_vehicle:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vehicle ID already exists",
        )

    existing_registration = (
        db.query(Vehicle)
        .filter(
            Vehicle.registration_number
            == vehicle_data.registration_number
        )
        .first()
    )

    if existing_registration:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration number already exists",
        )

    vehicle = Vehicle(
        vehicle_id=vehicle_data.vehicle_id,
        registration_number=vehicle_data.registration_number,
        vehicle_type=vehicle_data.vehicle_type,
        capacity=vehicle_data.capacity,
        fuel_type=vehicle_data.fuel_type,
        current_status="AVAILABLE",
        current_location=vehicle_data.current_location,
        fuel_level=vehicle_data.fuel_level,
        mileage=vehicle_data.mileage,
    )

    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    return vehicle


@router.get(
    "",
    response_model=list[VehicleResponse],
)
def list_vehicles(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
            "DRIVER",
        )
    ),
):
    return db.query(Vehicle).all()


@router.get(
    "/{vehicle_id}",
    response_model=VehicleResponse,
)
def get_vehicle(
    vehicle_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
            "DRIVER",
        )
    ),
):
    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id == vehicle_id
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    return vehicle


@router.put(
    "/{vehicle_id}",
    response_model=VehicleResponse,
)
def update_vehicle(
    vehicle_id: str,
    vehicle_data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN", "MANAGER")
    ),
):
    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id == vehicle_id
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    if vehicle_data.current_status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid vehicle status",
        )

    if (
        vehicle_data.registration_number
        != vehicle.registration_number
    ):
        existing_registration = (
            db.query(Vehicle)
            .filter(
                Vehicle.registration_number
                == vehicle_data.registration_number,
                Vehicle.vehicle_id != vehicle_id,
            )
            .first()
        )

        if existing_registration:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Registration number already exists",
            )

    active_assignment = get_active_assignment(
        db,
        vehicle_id,
    )

    # ASSIGNED and IN_TRANSIT require an active driver.
    if (
        vehicle_data.current_status
        in {"ASSIGNED", "IN_TRANSIT"}
        and not active_assignment
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "An active driver assignment is required "
                "for ASSIGNED or IN_TRANSIT status"
            ),
        )

    # AVAILABLE, MAINTENANCE and RETIRED vehicles
    # cannot keep an active driver assignment.
    if (
        vehicle_data.current_status
        in {"AVAILABLE", "MAINTENANCE", "RETIRED"}
        and active_assignment
    ):
        active_assignment.status = "COMPLETED"
        active_assignment.end_date = datetime.utcnow()

    vehicle.registration_number = (
        vehicle_data.registration_number
    )
    vehicle.vehicle_type = vehicle_data.vehicle_type
    vehicle.capacity = vehicle_data.capacity
    vehicle.fuel_type = vehicle_data.fuel_type
    vehicle.current_status = vehicle_data.current_status
    vehicle.current_location = vehicle_data.current_location
    vehicle.fuel_level = vehicle_data.fuel_level
    vehicle.mileage = vehicle_data.mileage

    db.commit()
    db.refresh(vehicle)

    return vehicle


@router.delete(
    "/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_vehicle(
    vehicle_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN")
    ),
):
    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id == vehicle_id
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    active_assignment = get_active_assignment(
        db,
        vehicle_id,
    )

    if active_assignment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete a vehicle with "
                "an active driver assignment"
            ),
        )

    active_shipment = (
        db.query(Shipment)
        .filter(
            Shipment.vehicle_id == vehicle_id,
            Shipment.status.in_(
                ["PENDING", "IN_TRANSIT"]
            ),
        )
        .first()
    )

    if active_shipment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete a vehicle with "
                "an active shipment"
            ),
        )

    if vehicle.current_status == "IN_TRANSIT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a vehicle that is IN_TRANSIT",
        )

    db.delete(vehicle)
    db.commit()

    return None