from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.auth.dependencies import require_roles
from app.auth.security import hash_password
from app.database.database import get_db
from app.models import User, DriverVehicleAssignment, Vehicle
from app.drivers.schemas import (
    DriverCreate,
    DriverResponse,
    AssignmentCreate,
    AssignmentResponse,
)


router = APIRouter(
    prefix="/drivers",
    tags=["Drivers"],
)


def build_driver_response(
    driver: User,
    assignment: DriverVehicleAssignment | None,
):
    return DriverResponse(
        driver_id=driver.user_id,
        name=driver.name,
        email=driver.email,
        phone=driver.phone,
        license_details=driver.license_details,
        experience_years=driver.experience_years,
        working_hours=driver.working_hours,
        account_status=driver.account_status,
        assigned_vehicle_id=(
            assignment.vehicle_id if assignment else None
        ),
    )


@router.post(
    "",
    response_model=DriverResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_driver(
    driver_data: DriverCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN", "MANAGER")
    ),
):
    existing_user = (
        db.query(User)
        .filter(User.user_id == driver_data.user_id)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Driver ID already exists",
        )

    existing_email = (
        db.query(User)
        .filter(User.email == driver_data.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists",
        )

    driver = User(
        user_id=driver_data.user_id,
        password_hash=hash_password(driver_data.password),
        role="DRIVER",
        name=driver_data.name,
        email=driver_data.email,
        phone=driver_data.phone,
        account_status="ACTIVE",
        license_details=driver_data.license_details,
        experience_years=driver_data.experience_years,
        working_hours=driver_data.working_hours,
    )

    db.add(driver)
    db.commit()
    db.refresh(driver)

    return build_driver_response(driver, None)


@router.get(
    "",
    response_model=list[DriverResponse],
)
def list_drivers(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):
    drivers = (
        db.query(User)
        .filter(User.role == "DRIVER")
        .all()
    )

    result = []

    for driver in drivers:
        assignment = (
            db.query(DriverVehicleAssignment)
            .filter(
                DriverVehicleAssignment.driver_id == driver.user_id,
                DriverVehicleAssignment.status == "ACTIVE",
            )
            .first()
        )

        result.append(
            build_driver_response(driver, assignment)
        )

    return result


@router.get(
    "/{driver_id}",
    response_model=DriverResponse,
)
def get_driver(
    driver_id: str,
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
    driver = (
        db.query(User)
        .filter(
            User.user_id == driver_id,
            User.role == "DRIVER",
        )
        .first()
    )

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )

    assignment = (
        db.query(DriverVehicleAssignment)
        .filter(
            DriverVehicleAssignment.driver_id == driver.user_id,
            DriverVehicleAssignment.status == "ACTIVE",
        )
        .first()
    )

    return build_driver_response(driver, assignment)

@router.post(
    "/{driver_id}/assign",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def assign_vehicle(
    driver_id: str,
    assignment_data: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN", "MANAGER", "DISPATCHER")
    ),
):
    driver = (
        db.query(User)
        .filter(
            User.user_id == driver_id,
            User.role == "DRIVER",
        )
        .first()
    )

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )

    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id == assignment_data.vehicle_id
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    existing_driver_assignment = (
        db.query(DriverVehicleAssignment)
        .filter(
            DriverVehicleAssignment.driver_id == driver_id,
            DriverVehicleAssignment.status == "ACTIVE",
        )
        .first()
    )

    if existing_driver_assignment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Driver already has an active vehicle assignment",
        )

    existing_vehicle_assignment = (
        db.query(DriverVehicleAssignment)
        .filter(
            DriverVehicleAssignment.vehicle_id
            == assignment_data.vehicle_id,
            DriverVehicleAssignment.status == "ACTIVE",
        )
        .first()
    )

    if existing_vehicle_assignment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vehicle is already assigned to another driver",
        )

    assignment = DriverVehicleAssignment(
        driver_id=driver_id,
        vehicle_id=assignment_data.vehicle_id,
        start_date=datetime.utcnow(),
        status="ACTIVE",
    )

    vehicle.current_status = "ASSIGNED"

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return assignment