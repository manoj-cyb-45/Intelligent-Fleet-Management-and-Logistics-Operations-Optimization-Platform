from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.database import get_db
from app.models import Vehicle
from app.vehicles.schemas import VehicleCreate, VehicleResponse


router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"],
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
    existing_vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.vehicle_id == vehicle_data.vehicle_id)
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
        .filter(Vehicle.vehicle_id == vehicle_id)
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
        .filter(Vehicle.vehicle_id == vehicle_id)
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    if vehicle_data.registration_number != vehicle.registration_number:
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

    vehicle.registration_number = vehicle_data.registration_number
    vehicle.vehicle_type = vehicle_data.vehicle_type
    vehicle.capacity = vehicle_data.capacity
    vehicle.fuel_type = vehicle_data.fuel_type
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
        .filter(Vehicle.vehicle_id == vehicle_id)
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    db.delete(vehicle)
    db.commit()

    return None