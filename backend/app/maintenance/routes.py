from datetime import date, datetime, time

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

def build_maintenance_response(record: MaintenanceRecord):
    return MaintenanceResponse(
        maintenance_id=record.maintenance_id,
        vehicle_id=record.vehicle_id,
        maintenance_type=record.maintenance_type,
        description=record.description,
        maintenance_date=(
            record.maintenance_date.date()
            if isinstance(record.maintenance_date, datetime)
            else record.maintenance_date
        ),
        due_date=(
            record.due_date.date()
            if isinstance(record.due_date, datetime)
            else record.due_date
        ),
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
        assignment.end_date = datetime.now()

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


# =========================================================
# DATE HELPERS
# =========================================================

def date_to_datetime(
    value: date | datetime | None,
):
    """
    Convert a date into a datetime at midnight.

    The database may still use a DATETIME column.
    This lets us use date-only values in the API
    without requiring an immediate database migration.
    """

    if value is None:
        return None

    if isinstance(value, datetime):
        return value

    return datetime.combine(
        value,
        time.min,
    )


def database_date(
    value: date | datetime | None,
):
    """
    Convert a database datetime/date into a date.
    """

    if value is None:
        return None

    if isinstance(value, datetime):
        return value.date()

    return value


# =========================================================
# DATE VALIDATION
# =========================================================

def validate_maintenance_dates(
    maintenance_date: date,
    due_date: date | None,
    maintenance_status: str,
):
    """
    Validate maintenance dates.

    SCHEDULED:
        - Maintenance date must be a future date.
        - Due date, when supplied, must not be in the past.
        - Due date cannot be before maintenance date.

    Other statuses:
        - Past dates are allowed because these records can
          represent completed or historical maintenance.
        - Due date cannot be before maintenance date.
    """

    today = date.today()

    # -----------------------------------------------------
    # MAINTENANCE DATE
    # -----------------------------------------------------

    if maintenance_status == "SCHEDULED":
        if maintenance_date <= today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Scheduled maintenance date must be "
                    "a future date"
                ),
            )

    # -----------------------------------------------------
    # DUE DATE
    # -----------------------------------------------------

    if due_date is not None:

        if due_date < maintenance_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Maintenance due date cannot be "
                    "before the maintenance date"
                ),
            )

        if (
            maintenance_status == "SCHEDULED"
            and due_date <= today
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Maintenance due date must be "
                    "a future date"
                ),
            )


# =========================================================
# VEHICLE VALIDATION
# =========================================================

def validate_vehicle_for_maintenance(
    db: Session,
    vehicle: Vehicle,
    maintenance_status: str,
):
    """
    Validate whether the vehicle can enter maintenance.

    SCHEDULED:
        Vehicle remains in its current state.

    IN_PROGRESS:
        Vehicle becomes MAINTENANCE.
        Active driver assignment is released.

        An IN_TRANSIT shipment blocks the operation.

    COMPLETED:
        Vehicle becomes AVAILABLE.

    CANCELLED:
        Vehicle state is handled by the calling function.
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
            Vehicle.vehicle_id
            == maintenance_data.vehicle_id
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
    # VALIDATE DATES
    # -----------------------------------------------------

    validate_maintenance_dates(
        maintenance_data.maintenance_date,
        maintenance_data.due_date,
        maintenance_data.status,
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

        # Database can remain DATETIME.
        # Store selected date at midnight.
        maintenance_date=date_to_datetime(
            maintenance_data.maintenance_date
        ),

        due_date=date_to_datetime(
            maintenance_data.due_date
        ),

        cost=maintenance_data.cost,
        status=maintenance_data.status,
    )

    db.add(record)

    # -----------------------------------------------------
    # VEHICLE STATE
    # -----------------------------------------------------

    if maintenance_data.status == "IN_PROGRESS":

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

    # SCHEDULED does not change vehicle state.

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
        .all()
    )

    today = datetime.now().date()

    upcoming = []
    past = []

    for record in records:

        maintenance_date = record.maintenance_date

        if isinstance(maintenance_date, datetime):
            maintenance_date = maintenance_date.date()

        if maintenance_date >= today:
            upcoming.append(record)
        else:
            past.append(record)

    # Upcoming maintenance:
    # nearest date first
    upcoming.sort(
        key=lambda record: (
            record.maintenance_date.date()
            if isinstance(
                record.maintenance_date,
                datetime
            )
            else record.maintenance_date
        )
    )

    # Past maintenance:
    # most recent date first
    past.sort(
        key=lambda record: (
            record.maintenance_date.date()
            if isinstance(
                record.maintenance_date,
                datetime
            )
            else record.maintenance_date
        ),
        reverse=True,
    )

    # Upcoming first, then past
    records = upcoming + past

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
    # FIND RECORD
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
    # VALIDATE DATES
    # -----------------------------------------------------

    validate_maintenance_dates(
        maintenance_data.maintenance_date,
        maintenance_data.due_date,
        maintenance_data.status,
    )

    # -----------------------------------------------------
    # STORE OLD VALUES
    # -----------------------------------------------------

    old_vehicle_id = record.vehicle_id
    old_status = record.status

    # -----------------------------------------------------
    # FIND OLD VEHICLE
    # -----------------------------------------------------

    old_vehicle = None

    if old_vehicle_id != maintenance_data.vehicle_id:

        old_vehicle = (
            db.query(Vehicle)
            .filter(
                Vehicle.vehicle_id
                == old_vehicle_id
            )
            .first()
        )

        # If this maintenance record was controlling
        # the old vehicle, release it.

        if old_vehicle and old_status == "IN_PROGRESS":

            old_vehicle.current_status = "AVAILABLE"

            db.add(old_vehicle)

    else:
        old_vehicle = new_vehicle

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

    record.maintenance_date = date_to_datetime(
        maintenance_data.maintenance_date
    )

    record.due_date = date_to_datetime(
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

        if old_status == "IN_PROGRESS":

            new_vehicle.current_status = "AVAILABLE"

            db.add(new_vehicle)

    # -----------------------------------------------------
    # NEW STATUS = SCHEDULED
    # -----------------------------------------------------

    elif maintenance_data.status == "SCHEDULED":

        # If this record was previously controlling the
        # vehicle, return the vehicle to AVAILABLE.

        if old_status == "IN_PROGRESS":

            new_vehicle.current_status = "AVAILABLE"

            db.add(new_vehicle)

    db.commit()
    db.refresh(record)

    return build_maintenance_response(record)