from datetime import datetime

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
    # DUPLICATE CHECKS
    # =====================================================

    existing_shipment = (
        db.query(Shipment)
        .filter(
            Shipment.shipment_id
            == shipment_data.shipment_id
        )
        .first()
    )

    if existing_shipment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Shipment ID already exists",
        )

    existing_tracking = (
        db.query(Shipment)
        .filter(
            Shipment.tracking_number
            == shipment_data.tracking_number
        )
        .first()
    )

    if existing_tracking:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tracking number already exists",
        )

    # =====================================================
    # VEHICLE
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

    # Vehicle cannot already be in transit
    if vehicle.current_status == "IN_TRANSIT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Vehicle cannot be assigned to a new "
                "shipment while it is IN_TRANSIT"
            ),
        )

    # Vehicle cannot be under maintenance
    if vehicle.current_status == "MAINTENANCE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Vehicle cannot be assigned to a shipment "
                "while it is under maintenance"
            ),
        )

    # Vehicle cannot already have an active transit shipment
    transit_shipment = (
        get_transit_shipment_for_vehicle(
            db,
            vehicle.vehicle_id,
        )
    )

    if transit_shipment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Vehicle already has an IN_TRANSIT shipment"
            ),
        )

    # =====================================================
    # DRIVER
    # =====================================================

    driver = (
        db.query(User)
        .filter(
            User.user_id == shipment_data.driver_id,
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
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Only ACTIVE drivers can be assigned "
                "to shipments"
            ),
        )

    # Driver cannot already be driving another transit shipment
    transit_driver_shipment = (
        get_transit_shipment_for_driver(
            db,
            driver.user_id,
        )
    )

    if transit_driver_shipment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Driver is already handling an "
                "IN_TRANSIT shipment"
            ),
        )

    # =====================================================
    # DRIVER-VEHICLE CONSISTENCY
    # =====================================================

    vehicle_assignment = (
        get_active_assignment_for_vehicle(
            db,
            vehicle.vehicle_id,
        )
    )

    driver_assignment = (
        get_active_assignment_for_driver(
            db,
            driver.user_id,
        )
    )

    # If vehicle is already assigned,
    # it must belong to this driver.
    if vehicle_assignment:

        if (
            vehicle_assignment.driver_id
            != driver.user_id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Vehicle is already assigned "
                    "to another driver"
                ),
            )

    # If driver is already assigned,
    # it must belong to this vehicle.
    if driver_assignment:

        if (
            driver_assignment.vehicle_id
            != vehicle.vehicle_id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Driver is already assigned "
                    "to another vehicle"
                ),
            )

    # =====================================================
    # CREATE ASSIGNMENT IF NEEDED
    # =====================================================

    if not vehicle_assignment:

        assignment = DriverVehicleAssignment(
            driver_id=driver.user_id,
            vehicle_id=vehicle.vehicle_id,
            start_date=datetime.utcnow(),
            status="ACTIVE",
        )

        db.add(assignment)

    # =====================================================
    # CREATE SHIPMENT
    # =====================================================

    shipment = Shipment(
        shipment_id=shipment_data.shipment_id,
        tracking_number=shipment_data.tracking_number,
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

    # Shipment exists but hasn't started.
    vehicle.current_status = "ASSIGNED"

    db.add(vehicle)

    db.flush()

    # =====================================================
    # HISTORY
    # =====================================================

    history = ShipmentHistory(
        shipment_id=shipment.shipment_id,
        status=shipment.status,
        location=shipment.current_location
        or shipment.origin,
        event_time=datetime.utcnow(),
        description="Shipment created",
    )

    db.add(history)

    db.commit()
    db.refresh(shipment)

    return build_shipment_response(
        shipment
    )


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
    shipments = (
        db.query(Shipment)
        .order_by(
            Shipment.created_at.desc()
        )
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

    if shipment_data.delivery_progress is not None:

        if shipment.status == "DELIVERED":
            shipment.delivery_progress = 100.0

        else:
            shipment.delivery_progress = (
                shipment_data.delivery_progress
            )

    # =====================================================
    # EXPECTED DELIVERY
    # =====================================================

    if shipment_data.expected_delivery_at is not None:
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