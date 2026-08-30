from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.auth.security import hash_password
from app.database.database import get_db

from app.models import (
    User,
    Vehicle,
    DriverVehicleAssignment,
    Shipment,
)

from app.drivers.schemas import (
    DriverCreate,
    DriverUpdate,
    DriverResponse,
    AssignmentCreate,
    AssignmentResponse,
)


router = APIRouter(
    prefix="/drivers",
    tags=["Drivers"],
)


# =========================================================
# HELPERS
# =========================================================

def get_active_assignment(
    db: Session,
    driver_id: str,
):
    return (
        db.query(DriverVehicleAssignment)
        .filter(
            DriverVehicleAssignment.driver_id == driver_id,
            DriverVehicleAssignment.status == "ACTIVE",
        )
        .first()
    )


def get_vehicle(
    db: Session,
    vehicle_id: str,
):
    return (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id == vehicle_id
        )
        .first()
    )


def get_transit_shipment_for_driver(
    db: Session,
    driver_id: str,
):
    return (
        db.query(Shipment)
        .filter(
            Shipment.driver_id == driver_id,
            Shipment.status == "IN_TRANSIT",
        )
        .first()
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
            assignment.vehicle_id
            if assignment
            else None
        ),
    )


# =========================================================
# CREATE DRIVER
# =========================================================

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
        .filter(
            User.user_id == driver_data.user_id
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Driver ID already exists",
        )

    existing_email = (
        db.query(User)
        .filter(
            User.email == driver_data.email
        )
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists",
        )

    driver = User(
        user_id=driver_data.user_id,
        password_hash=hash_password(
            driver_data.password
        ),
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

    return build_driver_response(
        driver,
        None,
    )


# =========================================================
# LIST DRIVERS
# =========================================================

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
        .filter(
            User.role == "DRIVER"
        )
        .order_by(User.user_id.asc())
        .all()
    )

    result = []

    for driver in drivers:

        assignment = get_active_assignment(
            db,
            driver.user_id,
        )

        result.append(
            build_driver_response(
                driver,
                assignment,
            )
        )

    return result


# =========================================================
# GET DRIVER
# =========================================================

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

    assignment = get_active_assignment(
        db,
        driver_id,
    )

    return build_driver_response(
        driver,
        assignment,
    )


# =========================================================
# UPDATE DRIVER
# =========================================================

@router.put(
    "/{driver_id}",
    response_model=DriverResponse,
)
def update_driver(
    driver_id: str,
    driver_data: DriverUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN", "MANAGER")
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

    # -----------------------------------------------------
    # TRANSIT DRIVER LOCK
    # -----------------------------------------------------

    transit_shipment = (
        get_transit_shipment_for_driver(
            db,
            driver_id,
        )
    )

    if transit_shipment:

        # Driver can have profile informat
        # 
        # 
        # ion changed,
        # but cannot be deactivated while driving.
        if driver_data.account_status != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Driver cannot be deactivated "
                    "while assigned to an IN_TRANSIT shipment"
                ),
            )

    # -----------------------------------------------------
    # EMAIL CHECK
    # -----------------------------------------------------

    existing_email = (
        db.query(User)
        .filter(
            User.email == driver_data.email,
            User.user_id != driver_id,
        )
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists",
        )

    # -----------------------------------------------------
    # UPDATE
    # -----------------------------------------------------

    driver.name = driver_data.name
    driver.email = driver_data.email
    driver.phone = driver_data.phone

    driver.license_details = (
        driver_data.license_details
    )

    driver.experience_years = (
        driver_data.experience_years
    )

    driver.working_hours = (
        driver_data.working_hours
    )

    driver.account_status = (
        driver_data.account_status
    )

    if driver_data.password:
        driver.password_hash = hash_password(
            driver_data.password
        )

    db.commit()
    db.refresh(driver)

    assignment = get_active_assignment(
        db,
        driver_id,
    )

    return build_driver_response(
        driver,
        assignment,
    )


# =========================================================
# ASSIGN / CHANGE VEHICLE
# =========================================================

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
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
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

    if driver.account_status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only ACTIVE drivers can be assigned vehicles"
            ),
        )

    # =====================================================
    # 🔒 DRIVER IN-TRANSIT LOCK
    # =====================================================

    transit_shipment = (
        get_transit_shipment_for_driver(
            db,
            driver_id,
        )
    )

    if transit_shipment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Driver cannot be reassigned while "
                "driving an IN_TRANSIT shipment"
            ),
        )

    current_assignment = get_active_assignment(
        db,
        driver_id,
    )

    # =====================================================
    # CURRENT VEHICLE LOCK
    # =====================================================

    if current_assignment:

        current_vehicle = get_vehicle(
            db,
            current_assignment.vehicle_id,
        )

        if current_vehicle:

            if current_vehicle.current_status == "IN_TRANSIT":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Driver cannot be reassigned while "
                        "the current vehicle is IN_TRANSIT"
                    ),
                )

            current_transit_shipment = (
                db.query(Shipment)
                .filter(
                    Shipment.vehicle_id
                    == current_vehicle.vehicle_id,
                    Shipment.status
                    == "IN_TRANSIT",
                )
                .first()
            )

            if current_transit_shipment:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Driver cannot be reassigned because "
                        "the current vehicle has an "
                        "IN_TRANSIT shipment"
                    ),
                )

        if (
            current_assignment.vehicle_id
            == assignment_data.vehicle_id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Driver is already assigned "
                    "to this vehicle"
                ),
            )

    # =====================================================
    # NEW VEHICLE
    # =====================================================

    vehicle = get_vehicle(
        db,
        assignment_data.vehicle_id,
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    # =====================================================
    # NEW VEHICLE MUST BE AVAILABLE
    # =====================================================

    if vehicle.current_status != "AVAILABLE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Vehicle is not available. "
                "Only AVAILABLE vehicles can be assigned."
            ),
        )

    # =====================================================
    # NEW VEHICLE CANNOT HAVE TRANSIT SHIPMENT
    # =====================================================

    transit_shipment = (
    db.query(Shipment)
    .filter(
        Shipment.vehicle_id == vehicle.vehicle_id,
        Shipment.status == "IN_TRANSIT",
    )
    .first()
)

    if transit_shipment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
            "Vehicle cannot be assigned because "
            "it has an IN_TRANSIT shipment"
        ),
    )

    transit_shipment = (
        db.query(Shipment)
        .filter(
            Shipment.vehicle_id == vehicle.vehicle_id,
            Shipment.status == "IN_TRANSIT",
        )
        .first()
    )

    if transit_shipment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Vehicle cannot be assigned because "
                "it has an IN_TRANSIT shipment"
            ),
        )

    # =====================================================
    # VEHICLE ASSIGNMENT CHECK
    # =====================================================

    existing_vehicle_assignment = (
        db.transit_shipmentquery(DriverVehicleAssignment)
        .filter(
            DriverVehicleAssignment.vehicle_id
            == vehicle.vehicle_id,
            DriverVehicleAssignment.status
            == "ACTIVE",
        )
        .first()
    )

    if existing_vehicle_assignment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Vehicle is already assigned "
                "to another driver"
            ),
        )

    # =====================================================
    # RELEASE OLD VEHICLE
    # =====================================================

    if current_assignment:

        old_vehicle = get_vehicle(
            db,
            current_assignment.vehicle_id,
        )

        current_assignment.status = "COMPLETED"
        current_assignment.end_date = datetime.utcnow()

        if old_vehicle:
            old_vehicle.current_status = "AVAILABLE"
            db.add(old_vehicle)

        db.add(current_assignment)

    # =====================================================
    # CREATE ASSIGNMENT
    # =====================================================

    assignment = DriverVehicleAssignment(
        driver_id=driver_id,
        vehicle_id=vehicle.vehicle_id,
        start_date=datetime.utcnow(),
        status="ACTIVE",
    )

    vehicle.current_status = "ASSIGNED"

    db.add(assignment)
    db.add(vehicle)

    db.commit()
    db.refresh(assignment)

    return assignment


# =========================================================
# UNASSIGN VEHICLE
# =========================================================

@router.post(
    "/{driver_id}/unassign",
    response_model=DriverResponse,
)
def unassign_vehicle(
    driver_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
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

    # =====================================================
    # 🔒 DRIVER TRANSIT LOCK
    # =====================================================

    transit_shipment = (
        get_transit_shipment_for_driver(
            db,
            driver_id,
        )
    )

    if transit_shipment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Driver cannot be unassigned while "
                "handling an IN_TRANSIT shipment"
            ),
        )

    assignment = get_active_assignment(
        db,
        driver_id,
    )

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Driver has no active vehicle assignment"
            ),
        )

    vehicle = get_vehicle(
        db,
        assignment.vehicle_id,
    )

    # =====================================================
    # VEHICLE TRANSIT LOCK
    # =====================================================

    if vehicle:

        if vehicle.current_status == "IN_TRANSIT":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Driver cannot be unassigned while "
                    "the vehicle is IN_TRANSIT"
                ),
            )

        transit_shipment = (
            db.query(Shipment)
            .filter(
                Shipment.vehicle_id
                == vehicle.vehicle_id,
                Shipment.status
                == "IN_TRANSIT",
            )
            .first()
        )

        if transit_shipment:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Driver cannot be unassigned because "
                    "the vehicle has an IN_TRANSIT shipment"
                ),
            )

    # =====================================================
    # RELEASE
    # =====================================================

    assignment.status = "COMPLETED"
    assignment.end_date = datetime.utcnow()

    if vehicle:
        vehicle.current_status = "AVAILABLE"
        db.add(vehicle)

    db.add(assignment)

    db.commit()
    db.refresh(driver)

    return build_driver_response(
        driver,
        None,
    )


# =========================================================
# DELETE DRIVER
# =========================================================

@router.delete(
    "/{driver_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_driver(
    driver_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN")
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

    # -----------------------------------------------------
    # ACTIVE ASSIGNMENT
    # -----------------------------------------------------

    assignment = get_active_assignment(
        db,
        driver_id,
    )

    if assignment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete a driver with an active "
                "vehicle assignment. Unassign the vehicle first."
            ),
        )

    # -----------------------------------------------------
    # SHIPMENT RELATIONSHIP
    # -----------------------------------------------------

    shipment = (
        db.query(Shipment)
        .filter(
            Shipment.driver_id == driver_id
        )
        .first()
    )

    if shipment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete driver because "
                "shipment records reference this driver"
            ),
        )

    db.delete(driver)
    db.commit()

    return None