from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.database import get_db
from app.models import Shipment, User, Vehicle
from app.models.trip import Trip
from app.trips.schemas import TripCreate, TripResponse, TripUpdate

router = APIRouter(
    prefix="/trips",
    tags=["Trips"],
)


VALID_STATUSES = {
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
}


def next_trip_id(db: Session) -> str:
    rows = db.query(Trip.trip_id).all()
    highest = 0

    for (value,) in rows:
        if not value:
            continue
        try:
            highest = max(highest, int(str(value).replace("TP", "")))
        except ValueError:
            continue

    return f"TP{highest + 1:03d}"


def response(trip: Trip) -> TripResponse:
    return TripResponse(
        trip_id=trip.trip_id,
        shipment_id=trip.shipment_id,
        vehicle_id=trip.vehicle_id,
        driver_id=trip.driver_id,
        planned_departure=trip.planned_departure,
        planned_arrival=trip.planned_arrival,
        actual_departure=trip.actual_departure,
        actual_arrival=trip.actual_arrival,
        status=trip.status,
        created_at=trip.created_at,
        updated_at=trip.updated_at,
    )


def ensure_no_overlap(
    db: Session,
    vehicle_id: str,
    driver_id: str,
    departure: datetime,
    arrival: datetime,
    exclude_trip_id: str | None = None,
):
    query = db.query(Trip).filter(
        Trip.status.in_(["SCHEDULED", "IN_PROGRESS"]),
        Trip.planned_departure < arrival,
        Trip.planned_arrival > departure,
    )

    if exclude_trip_id:
        query = query.filter(Trip.trip_id != exclude_trip_id)

    for trip in query.all():
        if trip.vehicle_id == vehicle_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Vehicle {vehicle_id} already has an overlapping trip "
                    f"({trip.trip_id})."
                ),
            )
        if trip.driver_id == driver_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Driver {driver_id} already has an overlapping trip "
                    f"({trip.trip_id})."
                ),
            )


@router.post(
    "",
    response_model=TripResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_trip(
    trip_data: TripCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN", "MANAGER", "DISPATCHER")
    ),
):
    shipment = (
        db.query(Shipment)
        .filter(Shipment.shipment_id == trip_data.shipment_id)
        .first()
    )

    if not shipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipment not found.",
        )

    if shipment.status in {"DELIVERED", "CANCELLED"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A delivered or cancelled shipment cannot be scheduled.",
        )

    existing = (
        db.query(Trip)
        .filter(Trip.shipment_id == shipment.shipment_id)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Shipment already has trip {existing.trip_id}.",
        )

    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.vehicle_id == shipment.vehicle_id)
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipment vehicle not found.",
        )

    driver = (
        db.query(User)
        .filter(
            User.user_id == shipment.driver_id,
            User.role == "DRIVER",
        )
        .first()
    )

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shipment driver not found.",
        )

    if vehicle.current_status in {"MAINTENANCE", "RETIRED"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vehicle is not available for scheduling.",
        )

    # The shipment's existing delivery deadline is the
    # authoritative planned arrival time for the trip.
    if shipment.due_date is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Shipment does not have a delivery date.",
        )

    planned_departure = datetime.now()
    planned_arrival = shipment.due_date

    if planned_arrival <= planned_departure:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shipment delivery date must be later than the current time.",
        )

    ensure_no_overlap(
        db,
        vehicle.vehicle_id,
        driver.user_id,
        planned_departure,
        planned_arrival,
    )

    trip = Trip(
        trip_id=next_trip_id(db),
        shipment_id=shipment.shipment_id,
        vehicle_id=vehicle.vehicle_id,
        driver_id=driver.user_id,
        planned_departure=planned_departure,
        planned_arrival=planned_arrival,
        status="SCHEDULED",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(trip)

    # Keep the shipment's expected delivery synchronized
    # with the delivery deadline used by the trip.
    shipment.expected_delivery_at = planned_arrival
    shipment.updated_at = datetime.utcnow()

    db.add(shipment)

    db.commit()
    db.refresh(trip)

    return response(trip)


@router.get(
    "",
    response_model=list[TripResponse],
)
def list_trips(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN", "MANAGER", "DISPATCHER", "DRIVER")
    ),
):
    query = db.query(Trip).order_by(Trip.planned_departure.asc())

    if str(current_user.get("role", "")).upper() == "DRIVER":
        query = query.filter(
            Trip.driver_id == current_user.get("user_id")
        )

    return [response(trip) for trip in query.all()]


@router.get(
    "/{trip_id}",
    response_model=TripResponse,
)
def get_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN", "MANAGER", "DISPATCHER", "DRIVER")
    ),
):
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found.",
        )

    if (
        str(current_user.get("role", "")).upper() == "DRIVER"
        and trip.driver_id != current_user.get("user_id")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Drivers can access only their assigned trips.",
        )

    return response(trip)


@router.put(
    "/{trip_id}",
    response_model=TripResponse,
)
def update_trip(
    trip_id: str,
    trip_data: TripUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN", "MANAGER", "DISPATCHER")
    ),
):
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found.",
        )

    if trip_data.status is not None:
        new_status = trip_data.status.strip().upper()
        if new_status not in VALID_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid trip status.",
            )

        if new_status == "IN_PROGRESS":
            if trip.status != "SCHEDULED":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A completed trip cannot be started again.",
                )

            if trip.actual_departure is None:
                trip.actual_departure = datetime.utcnow()

            shipment = (
                db.query(Shipment)
                .filter(Shipment.shipment_id == trip.shipment_id)
                .first()
            )

            if shipment:
                if shipment.status in {"DELIVERED", "CANCELLED"}:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="The shipment cannot be started.",
                    )

                shipment.status = "IN_TRANSIT"
                shipment.started_at = shipment.started_at or datetime.utcnow()
                shipment.updated_at = datetime.utcnow()

        elif new_status == "COMPLETED":
            if trip.status != "IN_PROGRESS":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Only an in-progress trip can be completed.",
                )

            if trip.actual_arrival is None:
                trip.actual_arrival = datetime.utcnow()

        trip.status = new_status

    departure = trip_data.planned_departure or trip.planned_departure
    arrival = trip_data.planned_arrival or trip.planned_arrival

    if arrival <= departure:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Planned arrival must be later than planned departure.",
        )

    if (
        trip_data.planned_departure is not None
        or trip_data.planned_arrival is not None
    ):
        ensure_no_overlap(
            db,
            trip.vehicle_id,
            trip.driver_id,
            departure,
            arrival,
            exclude_trip_id=trip.trip_id,
        )
        trip.planned_departure = departure
        trip.planned_arrival = arrival

        shipment = (
            db.query(Shipment)
            .filter(Shipment.shipment_id == trip.shipment_id)
            .first()
        )
        if shipment:
            shipment.expected_delivery_at = arrival
            shipment.updated_at = datetime.utcnow()

    trip.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(trip)

    return response(trip)


@router.delete(
    "/{trip_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def cancel_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN", "MANAGER", "DISPATCHER")
    ),
):
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found.",
        )

    if trip.status in {"COMPLETED", "CANCELLED"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Trip is already completed or cancelled.",
        )

    trip.status = "CANCELLED"
    trip.updated_at = datetime.utcnow()

    db.commit()
