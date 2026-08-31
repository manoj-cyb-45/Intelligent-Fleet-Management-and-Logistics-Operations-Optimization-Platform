from datetime import datetime
import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.database import get_db

from app.models import (
    Shipment,
    Vehicle,
    User,
    ShipmentHistory,
    Alert,
    DriverVehicleAssignment,
)

from app.shipments.schemas import (
    ShipmentCreate,
    ShipmentResponse,
    ShipmentUpdate,
    ShipmentHistoryResponse,
)


router = APIRouter(
    prefix="/shipments",
    tags=["Shipments"],
)


# =========================================================
# HELPERS
# =========================================================

def build_shipment_response(
    shipment: Shipment,
):
    return ShipmentResponse(
        shipment_id=shipment.shipment_id,
        tracking_number=shipment.tracking_number,
        description=shipment.description,
        origin=shipment.origin,
        destination=shipment.destination,
        due_date=shipment.due_date,
        status=shipment.status,
        current_location=shipment.current_location,
        delivery_progress=shipment.delivery_progress,
        started_at=shipment.started_at,
        expected_delivery_at=shipment.expected_delivery_at,
        delivered_at=shipment.delivered_at,
        vehicle_id=shipment.vehicle_id,
        driver_id=shipment.driver_id,
        created_at=shipment.created_at,
        updated_at=shipment.updated_at,
    )


def get_active_assignment_for_vehicle(
    db: Session,
    vehicle_id: str,
):
    return (
        db.query(DriverVehicleAssignment)
        .filter(
            DriverVehicleAssignment.vehicle_id
            == vehicle_id,
            DriverVehicleAssignment.status
            == "ACTIVE",
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
            DriverVehicleAssignment.driver_id
            == driver_id,
            DriverVehicleAssignment.status
            == "ACTIVE",
        )
        .first()
    )


def get_transit_shipment_for_vehicle(
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


# =========================================================
# AUTOMATIC SHIPMENT / TRACKING IDs
# =========================================================

def get_next_number(db: Session, field):
    values = db.query(field).all()
    highest = 0

    for (value,) in values:
        if not value:
            continue

        match = re.search(r"(\d+)$", str(value))
        if match:
            highest = max(highest, int(match.group(1)))

    return highest + 1


def generate_shipment_ids(db: Session):
    number = get_next_number(db, Shipment.shipment_id)

    shipment_id = f"SH{number:03d}"
    tracking_number = f"TRK{number:03d}"

    while (
        db.query(Shipment)
        .filter(
            (Shipment.shipment_id == shipment_id)
            | (Shipment.tracking_number == tracking_number)
        )
        .first()
    ):
        number += 1
        shipment_id = f"SH{number:03d}"
        tracking_number = f"TRK{number:03d}"

    return shipment_id, tracking_number


# =========================================================
# CREATE SHIPMENT
# =========================================================

@router.post(
    "",
    response_model=ShipmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_shipment(
    shipment_data: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):

    # =====================================================
    # DUE DATE VALIDATION
    # =====================================================

    if shipment_data.due_date.date() < datetime.now().date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shipment due date cannot be in the past",
        )

    # =====================================================
    # GENERATE IDs
    # =====================================================

    shipment_id, tracking_number = generate_shipment_ids(db)

    # =====================================================
    # CHECK VEHICLE
    # =====================================================

    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id
            == shipment_data.vehicle_id
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    # =====================================================
    # CHECK DRIVER
    # =====================================================

    driver = (
        db.query(User)
        .filter(
            User.user_id
            == shipment_data.driver_id,
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
    # CREATE SHIPMENT
    # =====================================================

    shipment = Shipment(
        shipment_id=shipment_id,
        tracking_number=tracking_number,
        description=shipment_data.description,
        origin=shipment_data.origin,
        destination=shipment_data.destination,
        due_date=shipment_data.due_date,

        status="PENDING",
        current_location=shipment_data.origin,
        delivery_progress=0.0,

        started_at=None,
        expected_delivery_at=None,
        delivered_at=None,

        vehicle_id=shipment_data.vehicle_id,
        driver_id=shipment_data.driver_id,

        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(shipment)

    # =====================================================
    # CREATE INITIAL HISTORY
    # =====================================================

    db.flush()

    history = ShipmentHistory(
        shipment_id=shipment.shipment_id,
        status=shipment.status,
        location=(
            shipment.current_location
            or shipment.origin
        ),
        event_time=datetime.utcnow(),
        description="Shipment created",
    )

    db.add(history)

    # =====================================================
    # SAVE TO DATABASE
    # =====================================================

    db.commit()
    db.refresh(shipment)

    # =====================================================
    # RETURN RESPONSE
    # =====================================================

    return build_shipment_response(shipment)

# =========================================================
# LIST SHIPMENTS
# =========================================================

@router.get(
    "",
    response_model=list[ShipmentResponse],
)
def list_shipments(
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
    query = db.query(Shipment)

    if str(current_user.get("role", "")).upper() == "DRIVER":
        query = query.filter(
            Shipment.driver_id == current_user.get("user_id")
        )

    shipments = (
        query
        .order_by(Shipment.created_at.desc())
        .all()
    )

    return [
        build_shipment_response(
            shipment
        )
        for shipment in shipments
    ]


# =========================================================
# GET SHIPMENT
# =========================================================

@router.get(
    "/{shipment_id}",
    response_model=ShipmentResponse,
)
def get_shipment(
    shipment_id: str,
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
    shipment = (
        db.query(Shipment)
        .filter(
            Shipment.shipment_id == shipment_id
        )
        .first()
    )

    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipment not found",
        )

    return build_shipment_response(
        shipment
    )


# =========================================================
# UPDATE SHIPMENT
# =========================================================

@router.put(
    "/{shipment_id}",
    response_model=ShipmentResponse,
)
def update_shipment(
    shipment_id: str,
    shipment_data: ShipmentUpdate,
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
    shipment = (
        db.query(Shipment)
        .filter(
            Shipment.shipment_id
            == shipment_id
        )
        .first()
    )

    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipment not found",
        )

    # Drivers may update only their own assigned shipment.
    if (
        str(current_user.get("role", "")).upper() == "DRIVER"
        and shipment.driver_id != current_user.get("user_id")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Drivers can update only their assigned shipments",
        )

    old_status = shipment.status

    # =====================================================
    # STATUS
    # =====================================================

    if shipment_data.status is not None:

        allowed_statuses = {
            "PENDING",
            "IN_TRANSIT",
            "DELIVERED",
            "CANCELLED",
        }

        if shipment_data.status not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid shipment status",
            )

        new_status = shipment_data.status

        vehicle = (
            db.query(Vehicle)
            .filter(
                Vehicle.vehicle_id
                == shipment.vehicle_id
            )
            .first()
        )

        driver = (
            db.query(User)
            .filter(
                User.user_id
                == shipment.driver_id,
                User.role == "DRIVER",
            )
            .first()
        )

        # =================================================
        # START SHIPMENT
        # =================================================

        if new_status == "IN_TRANSIT":

            if old_status == "DELIVERED":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "A delivered shipment cannot "
                        "return to IN_TRANSIT"
                    ),
                )

            if old_status == "CANCELLED":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "A cancelled shipment cannot "
                        "return to IN_TRANSIT"
                    ),
                )

            if vehicle:

                if vehicle.current_status == "MAINTENANCE":
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            "Vehicle cannot enter transit "
                            "while under maintenance"
                        ),
                    )

                other_transit = (
                    db.query(Shipment)
                    .filter(
                        Shipment.vehicle_id
                        == vehicle.vehicle_id,
                        Shipment.status
                        == "IN_TRANSIT",
                        Shipment.shipment_id
                        != shipment.shipment_id,
                    )
                    .first()
                )

                if other_transit:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            "Vehicle is already handling "
                            "another IN_TRANSIT shipment"
                        ),
                    )

                vehicle.current_status = "IN_TRANSIT"
                db.add(vehicle)

            if driver:

                if driver.account_status != "ACTIVE":
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            "Inactive driver cannot "
                            "handle an IN_TRANSIT shipment"
                        ),
                    )

                other_driver_transit = (
                    db.query(Shipment)
                    .filter(
                        Shipment.driver_id
                        == driver.user_id,
                        Shipment.status
                        == "IN_TRANSIT",
                        Shipment.shipment_id
                        != shipment.shipment_id,
                    )
                    .first()
                )

                if other_driver_transit:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            "Driver is already handling "
                            "another IN_TRANSIT shipment"
                        ),
                    )

            shipment.started_at = (
                shipment.started_at
                or datetime.utcnow()
            )

        # =================================================
        # DELIVERED
        # =================================================

        elif new_status == "DELIVERED":

            shipment.delivery_progress = 100.0
            shipment.current_location = shipment.destination

            if shipment.delivered_at is None:
                shipment.delivered_at = datetime.utcnow()

            if vehicle:
                vehicle.current_status = "AVAILABLE"
                db.add(vehicle)

            # Release active driver-vehicle assignment
            assignment = (
                get_active_assignment_for_vehicle(
                    db,
                    shipment.vehicle_id,
                )
            )

            if assignment:

                assignment.status = "COMPLETED"
                assignment.end_date = datetime.utcnow()

                db.add(assignment)

        # =================================================
        # CANCELLED
        # =================================================

        elif new_status == "CANCELLED":

            if old_status == "DELIVERED":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "A delivered shipment cannot "
                        "be cancelled"
                    ),
                )

            if vehicle:
                vehicle.current_status = "AVAILABLE"
                db.add(vehicle)

            assignment = (
                get_active_assignment_for_vehicle(
                    db,
                    shipment.vehicle_id,
                )
            )

            if assignment:

                assignment.status = "COMPLETED"
                assignment.end_date = datetime.utcnow()

                db.add(assignment)

            alert = Alert(
                shipment_id=shipment.shipment_id,
                alert_type="SHIPMENT_CANCELLED",
                message=(
                    f"Shipment {shipment.shipment_id} "
                    f"has been cancelled"
                ),
                severity="HIGH",
                status="OPEN",
                created_at=datetime.utcnow(),
                resolved_at=None,
            )

            db.add(alert)

        # =================================================
        # PENDING
        # =================================================

        elif new_status == "PENDING":

            if old_status == "IN_TRANSIT":

                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "An IN_TRANSIT shipment cannot "
                        "be changed back to PENDING"
                    ),
                )

            shipment.delivered_at = None
            shipment.started_at = None
            shipment.delivery_progress = 0.0

            if vehicle:
                vehicle.current_status = "ASSIGNED"
                db.add(vehicle)

        shipment.status = new_status

    # =====================================================
    # LOCATION
    # =====================================================

    if shipment_data.current_location is not None:
        shipment.current_location = (
            shipment_data.current_location
        )

    # =====================================================
    # PROGRESS
    # =====================================================

    progress_by_status = {
        "PENDING": 0.0,
        "IN_TRANSIT": 50.0,
        "DELIVERED": 100.0,
        "CANCELLED": 0.0,
    }

    shipment.delivery_progress = progress_by_status[
        shipment.status
    ]

    # =====================================================
    # EXPECTED DELIVERY
    # =====================================================

    if shipment_data.expected_delivery_at is not None:
        if str(current_user.get("role", "")).upper() == "DRIVER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Drivers cannot change expected delivery date",
            )

        if shipment_data.expected_delivery_at.date() < datetime.now().date():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expected delivery date cannot be in the past",
            )

        shipment.expected_delivery_at = (
            shipment_data.expected_delivery_at
        )

    # =====================================================
    # UPDATED TIME
    # =====================================================

    shipment.updated_at = datetime.utcnow()

    # =====================================================
    # HISTORY
    # =====================================================

    history = ShipmentHistory(
        shipment_id=shipment.shipment_id,
        status=shipment.status,
        location=(
            shipment.current_location
            or shipment.origin
        ),
        event_time=datetime.utcnow(),
        description=(
            f"Shipment updated to "
            f"{shipment.status}"
        ),
    )

    db.add(history)

    db.commit()
    db.refresh(shipment)

    return build_shipment_response(
        shipment
    )


# =========================================================
# SHIPMENT HISTORY
# =========================================================

@router.get(
    "/{shipment_id}/history",
    response_model=list[ShipmentHistoryResponse],
)
def get_shipment_history(
    shipment_id: str,
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
    shipment = (
        db.query(Shipment)
        .filter(
            Shipment.shipment_id
            == shipment_id
        )
        .first()
    )

    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipment not found",
        )

    history = (
        db.query(ShipmentHistory)
        .filter(
            ShipmentHistory.shipment_id
            == shipment_id
        )
        .order_by(
            ShipmentHistory.event_time.asc()
        )
        .all()
    )

    return [
        ShipmentHistoryResponse(
            history_id=item.history_id,
            shipment_id=item.shipment_id,
            status=item.status,
            location=item.location,
            event_time=item.event_time,
            description=item.description,
        )
        for item in history
    ]