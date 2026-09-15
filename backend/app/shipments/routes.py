from datetime import datetime
import re

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.auth.jwt import decode_access_token
from app.database.database import get_db

from app.models import (
    Shipment,
    Vehicle,
    User,
    ShipmentHistory,
    Alert,
    DriverVehicleAssignment,
)

from app.shipments.websocket import shipment_connection_manager
from app.shipments.statuses import (
    VALID_SHIPMENT_STATUSES,
    STATUS_PROGRESS,
    VALID_STATUS_TRANSITIONS,
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
        latitude=shipment.latitude,
        longitude=shipment.longitude,
        created_at=shipment.created_at,
        updated_at=shipment.updated_at,
    )


def normalize_status(status_value: str | None) -> str | None:
    if status_value is None:
        return None

    value = str(status_value).strip().upper()

    # Legacy status compatibility.
    if value == "PENDING":
        return "CREATED"

    return value


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


def clamp_progress(value: float) -> float:
    return max(0.0, min(100.0, float(value)))


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
            highest = max(
                highest,
                int(match.group(1)),
            )

    return highest + 1


def generate_shipment_ids(db: Session):
    number = get_next_number(
        db,
        Shipment.shipment_id,
    )

    shipment_id = f"SH{number:03d}"
    tracking_number = f"TRK{number:03d}"

    while (
        db.query(Shipment)
        .filter(
            (Shipment.shipment_id == shipment_id)
            | (
                Shipment.tracking_number
                == tracking_number
            )
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
    # GENERATE IDS
    # =====================================================

    shipment_id, tracking_number = generate_shipment_ids(
        db
    )

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
        status="CREATED",
        current_location=shipment_data.origin,
        delivery_progress=STATUS_PROGRESS["CREATED"],
        started_at=None,
        expected_delivery_at=None,
        delivered_at=None,
        vehicle_id=shipment_data.vehicle_id,
        driver_id=shipment_data.driver_id,
        latitude=shipment_data.latitude,
        longitude=shipment_data.longitude,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(shipment)

    # =====================================================
    # INITIAL HISTORY
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
    # SAVE
    # =====================================================

    db.commit()
    db.refresh(shipment)

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

    if (
        str(
            current_user.get(
                "role",
                "",
            )
        ).upper()
        == "DRIVER"
    ):
        query = query.filter(
            Shipment.driver_id
            == current_user.get("user_id")
        )

    shipments = (
        query
        .order_by(
            Shipment.created_at.desc()
        )
        .all()
    )

    return [
        build_shipment_response(shipment)
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

    if (
        str(
            current_user.get(
                "role",
                "",
            )
        ).upper()
        == "DRIVER"
        and shipment.driver_id
        != current_user.get("user_id")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Drivers can access only their assigned shipments",
        )

    return build_shipment_response(shipment)


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

    current_role = str(
        current_user.get(
            "role",
            "",
        )
    ).upper()

    # Drivers may update only their own shipment.
    if (
        current_role == "DRIVER"
        and shipment.driver_id
        != current_user.get("user_id")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Drivers can update only their assigned shipments",
        )

    # =====================================================
    # NORMALIZE LEGACY STATUS
    # =====================================================

    old_status = normalize_status(
        shipment.status
    )

    if old_status != shipment.status:
        shipment.status = old_status

    # =====================================================
    # STATUS UPDATE
    # =====================================================

    if shipment_data.status is not None:

        new_status = normalize_status(
            shipment_data.status
        )

        if new_status not in VALID_SHIPMENT_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Invalid shipment status. "
                    "Allowed statuses: "
                    "CREATED, ASSIGNED, IN_TRANSIT, "
                    "DELAYED, DELIVERED, CANCELLED."
                ),
            )

        if new_status != old_status:

            allowed_transitions = (
                VALID_STATUS_TRANSITIONS.get(
                    old_status,
                    set(),
                )
            )

            if new_status not in allowed_transitions:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        f"Invalid status transition: "
                        f"{old_status} -> {new_status}"
                    ),
                )

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
        # ASSIGNED
        # =================================================

        if new_status == "ASSIGNED":

            if vehicle:
                if vehicle.current_status == "MAINTENANCE":
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            "Vehicle cannot be assigned "
                            "while under maintenance"
                        ),
                    )

                vehicle.current_status = "ASSIGNED"
                db.add(vehicle)

        # =================================================
        # IN TRANSIT
        # =================================================

        elif new_status == "IN_TRANSIT":

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

            shipment.delivered_at = None

            if shipment.delivery_progress < 10:
                shipment.delivery_progress = 10.0

        # =================================================
        # DELAYED
        # =================================================

        elif new_status == "DELAYED":

            if shipment.delivery_progress < 10:
                shipment.delivery_progress = 10.0

            if vehicle:
                vehicle.current_status = "IN_TRANSIT"
                db.add(vehicle)

            # Create a delayed alert.
            existing_alert = (
                db.query(Alert)
                .filter(
                    Alert.shipment_id
                    == shipment.shipment_id,
                    Alert.alert_type
                    == "SHIPMENT_DELAYED",
                    Alert.status == "OPEN",
                )
                .first()
            )

            if not existing_alert:
                alert = Alert(
                    shipment_id=shipment.shipment_id,
                    alert_type="SHIPMENT_DELAYED",
                    message=(
                        f"Shipment "
                        f"{shipment.shipment_id} "
                        f"has been marked as delayed"
                    ),
                    severity="HIGH",
                    status="OPEN",
                    created_at=datetime.utcnow(),
                    resolved_at=None,
                )

                db.add(alert)

        # =================================================
        # DELIVERED
        # =================================================

        elif new_status == "DELIVERED":

            shipment.delivery_progress = 100.0
            shipment.current_location = (
                shipment.destination
            )

            if shipment.delivered_at is None:
                shipment.delivered_at = (
                    datetime.utcnow()
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
                assignment.end_date = (
                    datetime.utcnow()
                )

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
                assignment.end_date = (
                    datetime.utcnow()
                )

                db.add(assignment)

            existing_alert = (
                db.query(Alert)
                .filter(
                    Alert.shipment_id
                    == shipment.shipment_id,
                    Alert.alert_type
                    == "SHIPMENT_CANCELLED",
                    Alert.status == "OPEN",
                )
                .first()
            )

            if not existing_alert:
                alert = Alert(
                    shipment_id=shipment.shipment_id,
                    alert_type="SHIPMENT_CANCELLED",
                    message=(
                        f"Shipment "
                        f"{shipment.shipment_id} "
                        f"has been cancelled"
                    ),
                    severity="HIGH",
                    status="OPEN",
                    created_at=datetime.utcnow(),
                    resolved_at=None,
                )

                db.add(alert)

        # =================================================
        # APPLY STATUS
        # =================================================

        shipment.status = new_status

        # Only use default status progress when there
        # is no meaningful GPS progress yet.
        if new_status == "CREATED":
            shipment.delivery_progress = 0.0

        elif new_status == "ASSIGNED":
            shipment.delivery_progress = max(
                shipment.delivery_progress,
                10.0,
            )

        elif new_status == "IN_TRANSIT":
            shipment.delivery_progress = max(
                shipment.delivery_progress,
                10.0,
            )

        elif new_status == "DELAYED":
            shipment.delivery_progress = max(
                shipment.delivery_progress,
                10.0,
            )

        elif new_status == "DELIVERED":
            shipment.delivery_progress = 100.0

        elif new_status == "CANCELLED":
            shipment.delivery_progress = (
                shipment.delivery_progress
            )

    # =====================================================
    # LOCATION
    # =====================================================

    if shipment_data.current_location is not None:
        shipment.current_location = (
            shipment_data.current_location
        )

    # =====================================================
    # GPS COORDINATES
    # =====================================================

    if shipment_data.latitude is not None:
        shipment.latitude = (
            shipment_data.latitude
        )

    if shipment_data.longitude is not None:
        shipment.longitude = (
            shipment_data.longitude
        )

    # =====================================================
    # EXPECTED DELIVERY
    # =====================================================

    if shipment_data.expected_delivery_at is not None:

        if current_role == "DRIVER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Drivers cannot change "
                    "expected delivery date"
                ),
            )

        if (
            shipment_data.expected_delivery_at.date()
            < datetime.now().date()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Expected delivery date "
                    "cannot be in the past"
                ),
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

    # =====================================================
    # SAVE
    # =====================================================

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

    current_role = str(
        current_user.get(
            "role",
            "",
        )
    ).upper()

    if (
        current_role == "DRIVER"
        and shipment.driver_id
        != current_user.get("user_id")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Drivers can access only "
                "their assigned shipments"
            ),
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


# =========================================================
# REAL-TIME SHIPMENT TRACKING WEBSOCKET
# =========================================================


@router.websocket(
    "/ws/{shipment_id}"
)
async def shipment_tracking_websocket(
    websocket: WebSocket,
    shipment_id: str,
    db: Session = Depends(get_db),
):
    """
    Authenticated real-time shipment tracking channel.

    Client:
        ws://127.0.0.1:8000/shipments/ws/{shipment_id}?token=JWT

    GPS message:

        {
            "type": "location_update",
            "latitude": 12.971600,
            "longitude": 77.594600,
            "current_location": "Bengaluru",
            "progress": 16.0
        }

    The optional progress field is used by the GPS
    simulator when available.

    Every valid update is persisted and broadcast
    to all clients watching the shipment.
    """

    # =====================================================
    # AUTHENTICATION
    # =====================================================

    token = websocket.query_params.get(
        "token"
    )

    if not token:
        await websocket.close(
            code=1008
        )
        return

    try:
        payload = decode_access_token(
            token
        )

        current_user_id = payload.get(
            "sub"
        )

        current_user_role = payload.get(
            "role"
        )

        if (
            not current_user_id
            or not current_user_role
        ):
            await websocket.close(
                code=1008
            )
            return

        current_user_role = str(
            current_user_role
        ).upper()

    except Exception:
        await websocket.close(
            code=1008
        )
        return

    allowed_roles = {
        "ADMIN",
        "MANAGER",
        "DISPATCHER",
        "DRIVER",
    }

    if current_user_role not in allowed_roles:
        await websocket.close(
            code=1008
        )
        return

    # =====================================================
    # LOAD SHIPMENT
    # =====================================================

    shipment = (
        db.query(Shipment)
        .filter(
            Shipment.shipment_id
            == shipment_id
        )
        .first()
    )

    if not shipment:
        await websocket.close(
            code=1008
        )
        return

    # =====================================================
    # DRIVER AUTHORIZATION
    # =====================================================

    if (
        current_user_role == "DRIVER"
        and shipment.driver_id
        != current_user_id
    ):
        await websocket.close(
            code=1008
        )
        return

    # =====================================================
    # CONNECT
    # =====================================================

    await shipment_connection_manager.connect(
        shipment_id,
        websocket,
    )

    try:

        # =================================================
        # INITIAL STATE
        # =================================================

        await websocket.send_json(
            {
                "type": "tracking_connected",
                "shipment_id": shipment.shipment_id,
                "tracking_number": shipment.tracking_number,
                "latitude": shipment.latitude,
                "longitude": shipment.longitude,
                "current_location": shipment.current_location,
                "status": shipment.status,
                "delivery_progress": (
                    shipment.delivery_progress
                ),
                "updated_at": (
                    shipment.updated_at.isoformat()
                    if shipment.updated_at
                    else None
                ),
            }
        )

        # =================================================
        # MESSAGE LOOP
        # =================================================

        while True:

            message = (
                await websocket.receive_json()
            )

            if not isinstance(
                message,
                dict,
            ):
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": (
                            "Tracking message must "
                            "be a JSON object."
                        ),
                    }
                )
                continue

            message_type = message.get(
                "type"
            )

            # =================================================
            # PING
            # =================================================

            if message_type == "ping":

                await websocket.send_json(
                    {
                        "type": "pong"
                    }
                )

                continue

            # =================================================
            # LOCATION UPDATE
            # =================================================

            if message_type != "location_update":

                await websocket.send_json(
                    {
                        "type": "error",
                        "message": (
                            "Unsupported tracking "
                            "message type."
                        ),
                    }
                )

                continue

            latitude = message.get(
                "latitude"
            )

            longitude = message.get(
                "longitude"
            )

            current_location = message.get(
                "current_location"
            )

            # =================================================
            # VALIDATE GPS
            # =================================================

            try:

                latitude = float(
                    latitude
                )

                longitude = float(
                    longitude
                )

            except (
                TypeError,
                ValueError,
            ):

                await websocket.send_json(
                    {
                        "type": "error",
                        "message": (
                            "Latitude and longitude "
                            "must be valid numbers."
                        ),
                    }
                )

                continue

            if not -90 <= latitude <= 90:

                await websocket.send_json(
                    {
                        "type": "error",
                        "message": (
                            "Latitude must be "
                            "between -90 and 90."
                        ),
                    }
                )

                continue

            if not -180 <= longitude <= 180:

                await websocket.send_json(
                    {
                        "type": "error",
                        "message": (
                            "Longitude must be "
                            "between -180 and 180."
                        ),
                    }
                )

                continue

            # =================================================
            # UPDATE GPS
            # =================================================

            shipment.latitude = latitude
            shipment.longitude = longitude

            if (
                isinstance(
                    current_location,
                    str,
                )
                and current_location.strip()
            ):
                shipment.current_location = (
                    current_location.strip()
                )

            # =================================================
            # PROGRESS
            # =================================================
            #
            # The GPS simulator can send:
            #
            #     "progress": 16.5
            #
            # We accept it, validate it, and clamp it
            # between 0 and 100.
            #
            # If no progress is provided, retain the
            # shipment's current progress.
            # =================================================

            incoming_progress = message.get(
                "progress"
            )

            if incoming_progress is not None:

                try:

                    incoming_progress = clamp_progress(
                        float(
                            incoming_progress
                        )
                    )

                    # Do not allow GPS updates to reduce
                    # shipment progress.
                    shipment.delivery_progress = max(
                        shipment.delivery_progress,
                        incoming_progress,
                    )

                except (
                    TypeError,
                    ValueError,
                ):
                    pass

            # =================================================
            # AUTOMATIC STATUS
            # =================================================
            #
            # A valid GPS movement means the shipment
            # is actively being tracked.
            #
            # CREATED / ASSIGNED -> IN_TRANSIT
            #
            # DELAYED remains DELAYED until explicitly
            # changed back to IN_TRANSIT.
            # =================================================

            # =================================================
                # AUTOMATIC STATUS FROM GPS MOVEMENT
                # =================================================
                #
                # Support legacy PENDING shipments created before
                # the Milestone 2 status workflow was introduced.
                #
                # PENDING / CREATED / ASSIGNED + valid GPS update
                #                    ↓
                #                IN_TRANSIT
            # =================================================

            if shipment.status in {
                "PENDING",
                "CREATED",
                "ASSIGNED",
            }:

                shipment.status = "IN_TRANSIT"

                shipment.started_at = (
                    shipment.started_at
                    or datetime.utcnow()
                )

                if shipment.delivery_progress < 10:
                    shipment.delivery_progress = 10.0

                shipment.status = "IN_TRANSIT"

                shipment.started_at = (
                    shipment.started_at
                    or datetime.utcnow()
                )

                if shipment.delivery_progress < 10:
                    shipment.delivery_progress = 10.0

            # =================================================
            # AUTO COMPLETE
            # =================================================

            if (
                shipment.delivery_progress >= 100
                and shipment.status
                in {
                    "IN_TRANSIT",
                    "DELAYED",
                }
            ):

                shipment.delivery_progress = 100.0

                shipment.status = "DELIVERED"

                shipment.current_location = (
                    shipment.destination
                )

                shipment.delivered_at = (
                    shipment.delivered_at
                    or datetime.utcnow()
                )

                vehicle = (
                    db.query(Vehicle)
                    .filter(
                        Vehicle.vehicle_id
                        == shipment.vehicle_id
                    )
                    .first()
                )

                if vehicle:
                    vehicle.current_status = (
                        "AVAILABLE"
                    )
                    db.add(vehicle)

            # =================================================
            # UPDATE TIME
            # =================================================

            shipment.updated_at = (
                datetime.utcnow()
            )

            # =================================================
            # GPS HISTORY
            # =================================================

            history = ShipmentHistory(
                shipment_id=shipment.shipment_id,
                status=shipment.status,
                location=(
                    shipment.current_location
                    or shipment.origin
                ),
                event_time=datetime.utcnow(),
                description=(
                    "Real-time GPS tracking update"
                ),
            )

            db.add(history)

            # =================================================
            # SAVE
            # =================================================

            db.commit()
            db.refresh(shipment)

            # =================================================
            # BROADCAST
            # =================================================

            update_message = {
                "type": "location_updated",
                "shipment_id": shipment.shipment_id,
                "tracking_number": (
                    shipment.tracking_number
                ),
                "latitude": shipment.latitude,
                "longitude": shipment.longitude,
                "current_location": (
                    shipment.current_location
                ),
                "status": shipment.status,
                "delivery_progress": (
                    shipment.delivery_progress
                ),
                "updated_at": (
                    shipment.updated_at.isoformat()
                ),
            }

            await shipment_connection_manager.broadcast(
                shipment_id,
                update_message,
            )

    # =====================================================
    # DISCONNECT
    # =====================================================

    except WebSocketDisconnect:
        pass

    # =====================================================
    # ERROR
    # =====================================================

    except Exception as error:

        db.rollback()

        try:

            await websocket.send_json(
                {
                    "type": "error",
                    "message": (
                        "Unable to process "
                        "the tracking update."
                    ),
                }
            )

        except Exception:
            pass

        print(
            f"Shipment WebSocket error for "
            f"{shipment_id}: {error}"
        )

    # =====================================================
    # CLEANUP
    # =====================================================

    finally:

        await shipment_connection_manager.disconnect(
            shipment_id,
            websocket,
        )