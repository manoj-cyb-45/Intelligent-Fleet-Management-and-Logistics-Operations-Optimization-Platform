from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.database import get_db
from app.models import (
    Vehicle,
    User,
    DriverVehicleAssignment,
    Shipment,
    MaintenanceRecord,
)

from app.vehicles.schemas import (
    VehicleCreate,
    VehicleResponse,
)


router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"],
)


# =========================================================
# HELPERS
# =========================================================

def get_active_vehicle_assignment(
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


def get_active_driver_assignment(
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


def get_active_transit_shipment(
    db: Session,
    vehicle_id: str,
):
    return (
        db.query(Shipment)
        .filter(
            Shipment.vehicle_id == vehicle_id,
            Shipment.status == "IN_TRANSIT",
        )
        .first()
    )


def get_active_maintenance(
    db: Session,
    vehicle_id: str,
):
    return (
        db.query(MaintenanceRecord)
        .filter(
            MaintenanceRecord.vehicle_id == vehicle_id,
            MaintenanceRecord.status.in_(
                ["SCHEDULED", "IN_PROGRESS"]
            ),
        )
        .first()
    )


def build_vehicle_response(
    db: Session,
    vehicle: Vehicle,
):
    assignment = get_active_vehicle_assignment(
        db,
        vehicle.vehicle_id,
    )

    return VehicleResponse(
        vehicle_id=vehicle.vehicle_id,
        registration_number=vehicle.registration_number,
        vehicle_type=vehicle.vehicle_type,
        capacity=vehicle.capacity,
        fuel_type=vehicle.fuel_type,
        current_status=vehicle.current_status,
        current_location=vehicle.current_location,
        fuel_level=vehicle.fuel_level,
        mileage=vehicle.mileage,
        driver_id=(
            assignment.driver_id
            if assignment
            else None
        ),
    )


# =========================================================
# CREATE VEHICLE
# =========================================================

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

    allowed_statuses = {
        "AVAILABLE",
        "ASSIGNED",
        "IN_TRANSIT",
        "MAINTENANCE",
        "RETIRED",
    }

    if vehicle_data.current_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid vehicle status",
        )

    driver_id = vehicle_data.driver_id

    # -----------------------------------------------------
    # DRIVER VALIDATION
    # -----------------------------------------------------

    if vehicle_data.current_status in {
        "ASSIGNED",
        "IN_TRANSIT",
    }:

        if not driver_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "An active driver is required for "
                    "ASSIGNED or IN_TRANSIT vehicles"
                ),
            )

        driver = (
            db.query(User)
            .filter(
                User.user_id == driver_id,
                User.role == "DRIVER",
                User.account_status == "ACTIVE",
            )
            .first()
        )

        if not driver:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid active driver is required",
            )

        existing_driver_assignment = (
            get_active_driver_assignment(
                db,
                driver_id,
            )
        )

        if existing_driver_assignment:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Driver is already assigned "
                    "to another vehicle"
                ),
            )

    # -----------------------------------------------------
    # CREATE VEHICLE
    # -----------------------------------------------------

    vehicle = Vehicle(
        vehicle_id=vehicle_data.vehicle_id,
        registration_number=(
            vehicle_data.registration_number
        ),
        vehicle_type=vehicle_data.vehicle_type,
        capacity=vehicle_data.capacity,
        fuel_type=vehicle_data.fuel_type,
        current_status=vehicle_data.current_status,
        current_location=vehicle_data.current_location,
        fuel_level=vehicle_data.fuel_level,
        mileage=vehicle_data.mileage,
    )

    db.add(vehicle)
    db.flush()

    # -----------------------------------------------------
    # CREATE DRIVER ASSIGNMENT
    # -----------------------------------------------------

    if driver_id:

        assignment = DriverVehicleAssignment(
            driver_id=driver_id,
            vehicle_id=vehicle.vehicle_id,
            start_date=datetime.utcnow(),
            status="ACTIVE",
        )

        db.add(assignment)

    db.commit()
    db.refresh(vehicle)

    return build_vehicle_response(
        db,
        vehicle,
    )


# =========================================================
# LIST VEHICLES
# =========================================================

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
    vehicles = (
        db.query(Vehicle)
        .order_by(Vehicle.vehicle_id.asc())
        .all()
    )

    return [
        build_vehicle_response(
            db,
            vehicle,
        )
        for vehicle in vehicles
    ]


# =========================================================
# GET VEHICLE
# =========================================================

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

    return build_vehicle_response(
        db,
        vehicle,
    )


# =========================================================
# UPDATE VEHICLE
# =========================================================

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

    # =====================================================
    # STATUS VALIDATION
    # =====================================================

    allowed_statuses = {
        "AVAILABLE",
        "ASSIGNED",
        "IN_TRANSIT",
        "MAINTENANCE",
        "RETIRED",
    }

    if vehicle_data.current_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid vehicle status",
        )

    # =====================================================
    # CURRENT ASSIGNMENT
    # =====================================================

    current_assignment = (
        get_active_vehicle_assignment(
            db,
            vehicle_id,
        )
    )

    current_driver_id = (
        current_assignment.driver_id
        if current_assignment
        else None
    )

    requested_driver_id = (
        vehicle_data.driver_id
        if vehicle_data.driver_id
        else None
    )

    # =====================================================
    # 🔒 CHECK IN-TRANSIT SHIPMENT
    # =====================================================

    transit_shipment = get_active_transit_shipment(
        db,
        vehicle_id,
    )

    if transit_shipment:

        if requested_driver_id != current_driver_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Driver cannot be changed because "
                    "the vehicle is being used by an "
                    "IN_TRANSIT shipment"
                ),
            )

        if vehicle_data.current_status != "IN_TRANSIT":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Vehicle status cannot be changed "
                    "while it has an IN_TRANSIT shipment"
                ),
            )

    # =====================================================
    # 🔒 CURRENT VEHICLE STATUS IN TRANSIT
    # =====================================================

    if vehicle.current_status == "IN_TRANSIT":

        if requested_driver_id != current_driver_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Driver cannot be changed while "
                    "the vehicle is IN_TRANSIT"
                ),
            )

        if vehicle_data.current_status != "IN_TRANSIT":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Vehicle status cannot be changed "
                    "while the vehicle is IN_TRANSIT"
                ),
            )

    # =====================================================
    # MAINTENANCE CHECK
    # =====================================================

    active_maintenance = get_active_maintenance(
        db,
        vehicle_id,
    )

    if active_maintenance:

        if vehicle_data.current_status not in {
            "MAINTENANCE",
            "IN_TRANSIT",
        }:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Vehicle has an active maintenance "
                    "record and cannot be made AVAILABLE"
                ),
            )

    # =====================================================
    # REGISTRATION CHECK
    # =====================================================

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

    # =====================================================
    # DRIVER CHANGE
    # =====================================================

    if requested_driver_id != current_driver_id:

        # -------------------------------------------------
        # REMOVE DRIVER
        # -------------------------------------------------

        if not requested_driver_id:

            if current_assignment:

                current_assignment.status = "COMPLETED"
                current_assignment.end_date = datetime.utcnow()

                db.add(current_assignment)

        # -------------------------------------------------
        # ASSIGN NEW DRIVER
        # -------------------------------------------------

        else:

            new_driver = (
                db.query(User)
                .filter(
                    User.user_id == requested_driver_id,
                    User.role == "DRIVER",
                    User.account_status == "ACTIVE",
                )
                .first()
            )

            if not new_driver:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A valid active driver is required",
                )

            existing_driver_assignment = (
                get_active_driver_assignment(
                    db,
                    requested_driver_id,
                )
            )

            if existing_driver_assignment:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Driver is already assigned "
                        "to another vehicle"
                    ),
                )

            if current_assignment:

                current_assignment.status = "COMPLETED"
                current_assignment.end_date = datetime.utcnow()

                db.add(current_assignment)

            new_assignment = DriverVehicleAssignment(
                driver_id=requested_driver_id,
                vehicle_id=vehicle_id,
                start_date=datetime.utcnow(),
                status="ACTIVE",
            )

            db.add(new_assignment)

    # =====================================================
    # STATUS CONSISTENCY
    # =====================================================

    if vehicle_data.current_status in {
        "ASSIGNED",
        "IN_TRANSIT",
    } and not requested_driver_id:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "An active driver is required for "
                "ASSIGNED or IN_TRANSIT vehicles"
            ),
        )

    # =====================================================
    # UPDATE VEHICLE
    # =====================================================

    vehicle.registration_number = (
        vehicle_data.registration_number
    )

    vehicle.vehicle_type = (
        vehicle_data.vehicle_type
    )

    vehicle.capacity = (
        vehicle_data.capacity
    )

    vehicle.fuel_type = (
        vehicle_data.fuel_type
    )

    vehicle.current_status = (
        vehicle_data.current_status
    )

    vehicle.current_location = (
        vehicle_data.current_location
    )

    vehicle.fuel_level = (
        vehicle_data.fuel_level
    )

    vehicle.mileage = (
        vehicle_data.mileage
    )

    db.add(vehicle)

    db.commit()
    db.refresh(vehicle)

    return build_vehicle_response(
        db,
        vehicle,
    )


# =========================================================
# DELETE VEHICLE
# =========================================================

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

    # =====================================================
    # ACTIVE SHIPMENT CHECK
    # =====================================================

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
                "Cannot delete vehicle because it "
                "has an active shipment"
            ),
        )

    # =====================================================
    # IN-TRANSIT CHECK
    # =====================================================

    if vehicle.current_status == "IN_TRANSIT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="IN_TRANSIT vehicles cannot be deleted",
        )

    # =====================================================
    # ASSIGNMENT CHECK
    # =====================================================

    assignment = (
        get_active_vehicle_assignment(
            db,
            vehicle_id,
        )
    )

    if assignment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete a vehicle with "
                "an active driver assignment"
            ),
        )

    # =====================================================
    # RELATED RECORD CHECK
    # =====================================================

    maintenance = (
        db.query(MaintenanceRecord)
        .filter(
            MaintenanceRecord.vehicle_id == vehicle_id
        )
        .first()
    )

    if maintenance:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete vehicle because "
                "maintenance records exist"
            ),
        )

    db.delete(vehicle)
    db.commit()

    return None