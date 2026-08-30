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


def build_shipment_response(shipment: Shipment):
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
    existing_shipment = (
        db.query(Shipment)
        .filter(
            Shipment.shipment_id == shipment_data.shipment_id
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

    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id == shipment_data.vehicle_id
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

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
    db.flush()

    history = ShipmentHistory(
        shipment_id=shipment.shipment_id,
        status=shipment.status,
        location=shipment.current_location or shipment.origin,
        event_time=datetime.utcnow(),
        description="Shipment created",
    )

    db.add(history)

    db.commit()
    db.refresh(shipment)

    return build_shipment_response(shipment)


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
        .order_by(Shipment.created_at.desc())
        .all()
    )

    return [
        build_shipment_response(shipment)
        for shipment in shipments
    ]


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

    return build_shipment_response(shipment)


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
            Shipment.shipment_id == shipment_id
        )
        .first()
    )

    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipment not found",
        )

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

        shipment.status = shipment_data.status

        if shipment_data.status == "IN_TRANSIT":
            if shipment.started_at is None:
                shipment.started_at = datetime.utcnow()

        elif shipment_data.status == "DELIVERED":
            shipment.delivery_progress = 100.0

            if shipment.delivered_at is None:
                shipment.delivered_at = datetime.utcnow()

        elif shipment_data.status == "PENDING":
            shipment.delivered_at = None

    if shipment_data.current_location is not None:
        shipment.current_location = (
            shipment_data.current_location
        )

    if shipment_data.delivery_progress is not None:
        shipment.delivery_progress = (
            shipment_data.delivery_progress
        )

    if shipment_data.expected_delivery_at is not None:
        shipment.expected_delivery_at = (
            shipment_data.expected_delivery_at
        )

    shipment.updated_at = datetime.utcnow()

    history = ShipmentHistory(
    shipment_id=shipment.shipment_id,
    status=shipment.status,
    location=shipment.current_location or "",
    event_time=datetime.utcnow(),
    description=f"Shipment updated to {shipment.status}",
)

    db.add(history)

    if shipment.status == "CANCELLED":
        alert = Alert(
            shipment_id=shipment.shipment_id,
            alert_type="SHIPMENT_CANCELLED",
            message=f"Shipment {shipment.shipment_id} has been cancelled",
            severity="HIGH",
            status="OPEN",
            created_at=datetime.utcnow(),
            resolved_at=None,
        )

    db.add(alert)

    db.commit()
    db.refresh(shipment)

    return build_shipment_response(shipment)


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
            Shipment.shipment_id == shipment_id
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
            ShipmentHistory.shipment_id == shipment_id
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