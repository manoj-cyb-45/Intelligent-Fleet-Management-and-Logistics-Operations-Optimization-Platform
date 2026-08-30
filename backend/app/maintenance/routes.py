from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.database import get_db
from app.models import (
    MaintenanceRecord,
    Vehicle,
    DriverVehicleAssignment,
    Shipment,
)
from app.maintenance.schemas import (
    MaintenanceCreate,
    MaintenanceResponse,
)


router = APIRouter(
    prefix="/maintenance",
    tags=["Maintenance"],
)


ALLOWED_MAINTENANCE_STATUSES = {
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
}


# =========================================================
# HELPERS
# =========================================================

def build_maintenance_response(
    record: MaintenanceRecord,
):
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


def get_active_assignment_for_vehicle(
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


def get_active_assignment_for_driver(
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


def get_in_transit_shipment(
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


def release_vehicle_assignment(
    db: Session,
    vehicle_id: str,
):
    assignment = get_active_assignment_for_vehicle(
        db,
        vehicle_id,
    )

    if assignment:
        assignment.status = "COMPLETED"
        assignment.end_date = datetime.utcnow()

        db.add(assignment)

    return assignment


def validate_status(
    maintenance_status: str,
):
    if maintenance_status not in ALLOWED_MAINTENANCE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid maintenance status",
        )


def validate_vehicle_for_maintenance(
    db: Session,
    vehicle: Vehicle,
    maintenance_status: str,
):
    """
    Validate whether the vehicle can enter/leave maintenance.

    SCHEDULED:
        Does not change vehicle state.

    IN_PROGRESS:
        Vehicle becomes MAINTENANCE.
        An active driver assignment is released.

        However, an IN_TRANSIT shipment blocks the operation
        because changing the vehicle to MAINTENANCE while its
        shipment remains IN_TRANSIT would create inconsistent
        fleet state.

    COMPLETED:
        Vehicle becomes AVAILABLE.

    CANCELLED:
        Vehicle becomes AVAILABLE only when the maintenance
        record was controlling the vehicle.
    """

    if maintenance_status == "IN_PROGRESS":

        shipment = get_in_transit_shipment(
            db,
            vehicle.vehicle_id,
        )

        if shipment:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Vehicle cannot enter maintenance while it "
                    "has an IN_TRANSIT shipment. Complete or "
                    "cancel the shipment first."
                ),
            )


# =========================================================
# CREATE MAINTENANCE
# =========================================================

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
    # -----------------------------------------------------
    # FIND VEHICLE
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # VALIDATE STATUS
    # -----------------------------------------------------

    validate_status(
        maintenance_data.status
    )

    # -----------------------------------------------------
    # VALIDATE VEHICLE
    # -----------------------------------------------------

    validate_vehicle_for_maintenance(
        db,
        vehicle,
        maintenance_data.status,
    )

    # -----------------------------------------------------
    # CREATE RECORD
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # VEHICLE STATE SYNCHRONIZATION
    # -----------------------------------------------------

    if maintenance_data.status == "IN_PROGRESS":

        # Release any active driver assignment.
        #
        # This makes:
        #
        # Vehicle -> MAINTENANCE
        # Driver  -> no assigned vehicle
        #
        release_vehicle_assignment(
            db,
            vehicle.vehicle_id,
        )

        vehicle.current_status = "MAINTENANCE"

        db.add(vehicle)

    elif maintenance_data.status == "COMPLETED":

        vehicle.current_status = "AVAILABLE"

        db.add(vehicle)

    elif maintenance_data.status == "CANCELLED":

        vehicle.current_status = "AVAILABLE"

        db.add(vehicle)

    # SCHEDULED intentionally does not change
    # the current vehicle state.

    db.commit()
    db.refresh(record)

    return build_maintenance_response(record)


# =========================================================
# LIST MAINTENANCE
# =========================================================

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


# =========================================================
# GET MAINTENANCE
# =========================================================

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


# =========================================================
# UPDATE MAINTENANCE
# =========================================================

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
    # -----------------------------------------------------
    # FIND MAINTENANCE RECORD
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # FIND NEW VEHICLE
    # -----------------------------------------------------

    new_vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id
            == maintenance_data.vehicle_id
        )
        .first()
    )

    if not new_vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    # -----------------------------------------------------
    # VALIDATE STATUS
    # -----------------------------------------------------

    validate_status(
        maintenance_data.status
    )

    # -----------------------------------------------------
    # STORE OLD VALUES
    # -----------------------------------------------------

    old_vehicle_id = record.vehicle_id
    old_status = record.status

    # -----------------------------------------------------
    # IF CHANGING VEHICLE
    # -----------------------------------------------------

    if old_vehicle_id != maintenance_data.vehicle_id:

        old_vehicle = (
            db.query(Vehicle)
            .filter(
                Vehicle.vehicle_id == old_vehicle_id
            )
            .first()
        )

        if old_vehicle and old_status == "IN_PROGRESS":

            # If this maintenance record was putting the
            # old vehicle into maintenance, release it.
            old_vehicle.current_status = "AVAILABLE"

            db.add(old_vehicle)

    # -----------------------------------------------------
    # VALIDATE NEW VEHICLE
    # -----------------------------------------------------

    validate_vehicle_for_maintenance(
        db,
        new_vehicle,
        maintenance_data.status,
    )

    # -----------------------------------------------------
    # UPDATE RECORD
    # -----------------------------------------------------

    record.vehicle_id = (
        maintenance_data.vehicle_id
    )

    record.maintenance_type = (
        maintenance_data.maintenance_type
    )

    record.description = (
        maintenance_data.description
    )

    record.maintenance_date = (
        maintenance_data.maintenance_date
    )

    record.due_date = (
        maintenance_data.due_date
    )

    record.cost = (
        maintenance_data.cost
    )

    record.status = (
        maintenance_data.status
    )

    db.add(record)

    # -----------------------------------------------------
    # NEW STATUS = IN_PROGRESS
    # -----------------------------------------------------

    if maintenance_data.status == "IN_PROGRESS":

        # Release active driver assignment.
        release_vehicle_assignment(
            db,
            new_vehicle.vehicle_id,
        )

        new_vehicle.current_status = "MAINTENANCE"

        db.add(new_vehicle)

    # -----------------------------------------------------
    # NEW STATUS = COMPLETED
    # -----------------------------------------------------

    elif maintenance_data.status == "COMPLETED":

        new_vehicle.current_status = "AVAILABLE"

        db.add(new_vehicle)

    # -----------------------------------------------------
    # NEW STATUS = CANCELLED
    # -----------------------------------------------------

    elif maintenance_data.status == "CANCELLED":

        # Only return it to AVAILABLE if the previous
        # state of this maintenance record was IN_PROGRESS.
        if old_status == "IN_PROGRESS":

            new_vehicle.current_status = "AVAILABLE"

            db.add(new_vehicle)

    # -----------------------------------------------------
    # NEW STATUS = SCHEDULED
    # -----------------------------------------------------

    elif maintenance_data.status == "SCHEDULED":

        # Scheduled maintenance does not immediately
        # remove the vehicle from service.
        pass

    db.commit()
    db.refresh(record)

    return build_maintenance_response(record)