from datetime import datetime, timedelta
from typing import Tuple

from sqlalchemy.orm import Session

from app.models import (
    MaintenanceRecord,
    Shipment,
    User,
    Vehicle,
)
from app.shipments.schemas import (
    EntityAvailability,
)


def validate_time_window(
    start_time: datetime,
    end_time: datetime,
    is_new: bool = True,
) -> Tuple[bool, str | None]:
    """
    Validates chronological order of trip start and expected delivery times.
    """
    if start_time >= end_time:
        return False, "Scheduled start time must be strictly earlier than expected delivery time."

    if is_new:
        # Allow up to 15 minutes of leeway for clocks or immediate scheduling
        cutoff = datetime.utcnow() - timedelta(minutes=15)
        if start_time < cutoff:
            return False, "Scheduled start time cannot be in the past."

    return True, None


def check_vehicle_availability(
    db: Session,
    vehicle_id: str,
    start_time: datetime,
    end_time: datetime,
    exclude_shipment_id: str | None = None,
) -> EntityAvailability:
    """
    Checks if a vehicle is available for a trip during [start_time, end_time].
    """
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.vehicle_id == vehicle_id)
        .first()
    )

    if not vehicle:
        return EntityAvailability(
            available=False,
            reason="Vehicle not found",
        )

    # Status check
    if vehicle.current_status == "MAINTENANCE":
        return EntityAvailability(
            available=False,
            reason="Vehicle is currently undergoing maintenance",
        )

    if vehicle.current_status == "OUT_OF_SERVICE":
        return EntityAvailability(
            available=False,
            reason="Vehicle is currently out of service",
        )

    # Active IN_TRANSIT shipment check
    active_transit = (
        db.query(Shipment)
        .filter(
            Shipment.vehicle_id == vehicle_id,
            Shipment.status == "IN_TRANSIT",
            Shipment.shipment_id != exclude_shipment_id if exclude_shipment_id else True,
        )
        .first()
    )

    if active_transit:
        return EntityAvailability(
            available=False,
            reason=f"Vehicle is currently in transit with shipment {active_transit.shipment_id}",
            conflicting_shipment_id=active_transit.shipment_id,
        )

    # Overlapping scheduled / pending shipments
    scheduled_shipments = (
        db.query(Shipment)
        .filter(
            Shipment.vehicle_id == vehicle_id,
            Shipment.status.in_(["SCHEDULED", "PENDING"]),
            Shipment.shipment_id != exclude_shipment_id if exclude_shipment_id else True,
        )
        .all()
    )

    for s in scheduled_shipments:
        trip_start = s.scheduled_start_time or s.created_at
        trip_end = s.expected_delivery_at or s.due_date

        if trip_start and trip_end:
            overlap = max(start_time, trip_start) < min(end_time, trip_end)
            if overlap:
                formatted_start = trip_start.strftime("%Y-%m-%d %H:%M")
                formatted_end = trip_end.strftime("%Y-%m-%d %H:%M")
                return EntityAvailability(
                    available=False,
                    reason=(
                        f"Vehicle is already scheduled for shipment {s.shipment_id} "
                        f"({formatted_start} to {formatted_end})"
                    ),
                    conflicting_shipment_id=s.shipment_id,
                )

    # Overlapping scheduled vehicle maintenance records
    maintenance_records = (
        db.query(MaintenanceRecord)
        .filter(
            MaintenanceRecord.vehicle_id == vehicle_id,
            MaintenanceRecord.status.in_(["SCHEDULED", "IN_PROGRESS"]),
        )
        .all()
    )

    for m in maintenance_records:
        maint_start = m.maintenance_date
        maint_end = m.due_date or (m.maintenance_date + timedelta(days=1))

        if maint_start and maint_end:
            overlap = max(start_time, maint_start) < min(end_time, maint_end)
            if overlap:
                return EntityAvailability(
                    available=False,
                    reason=(
                        f"Vehicle has scheduled maintenance ({m.maintenance_type}) "
                        f"overlapping this time window"
                    ),
                )

    return EntityAvailability(available=True)


def check_driver_availability(
    db: Session,
    driver_id: str,
    start_time: datetime,
    end_time: datetime,
    exclude_shipment_id: str | None = None,
) -> EntityAvailability:
    """
    Checks if a driver is available for a trip during [start_time, end_time].
    """
    driver = (
        db.query(User)
        .filter(
            User.user_id == driver_id,
            User.role == "DRIVER",
        )
        .first()
    )

    if not driver:
        return EntityAvailability(
            available=False,
            reason="Driver not found or user is not a driver",
        )

    if driver.account_status != "ACTIVE":
        return EntityAvailability(
            available=False,
            reason=f"Driver account is currently {driver.account_status}",
        )

    # Active IN_TRANSIT shipment check
    active_transit = (
        db.query(Shipment)
        .filter(
            Shipment.driver_id == driver_id,
            Shipment.status == "IN_TRANSIT",
            Shipment.shipment_id != exclude_shipment_id if exclude_shipment_id else True,
        )
        .first()
    )

    if active_transit:
        return EntityAvailability(
            available=False,
            reason=f"Driver is currently in transit with shipment {active_transit.shipment_id}",
            conflicting_shipment_id=active_transit.shipment_id,
        )

    # Overlapping scheduled / pending shipments
    scheduled_shipments = (
        db.query(Shipment)
        .filter(
            Shipment.driver_id == driver_id,
            Shipment.status.in_(["SCHEDULED", "PENDING"]),
            Shipment.shipment_id != exclude_shipment_id if exclude_shipment_id else True,
        )
        .all()
    )

    for s in scheduled_shipments:
        trip_start = s.scheduled_start_time or s.created_at
        trip_end = s.expected_delivery_at or s.due_date

        if trip_start and trip_end:
            overlap = max(start_time, trip_start) < min(end_time, trip_end)
            if overlap:
                formatted_start = trip_start.strftime("%Y-%m-%d %H:%M")
                formatted_end = trip_end.strftime("%Y-%m-%d %H:%M")
                return EntityAvailability(
                    available=False,
                    reason=(
                        f"Driver is already scheduled for shipment {s.shipment_id} "
                        f"({formatted_start} to {formatted_end})"
                    ),
                    conflicting_shipment_id=s.shipment_id,
                )

    return EntityAvailability(available=True)


def get_available_resources(
    db: Session,
    start_time: datetime,
    end_time: datetime,
    exclude_shipment_id: str | None = None,
) -> Tuple[list[str], list[str]]:
    """
    Returns lists of available vehicle IDs and driver IDs for the specified time window.
    """
    all_vehicles = db.query(Vehicle).all()
    available_vehicles = []
    for v in all_vehicles:
        res = check_vehicle_availability(
            db=db,
            vehicle_id=v.vehicle_id,
            start_time=start_time,
            end_time=end_time,
            exclude_shipment_id=exclude_shipment_id,
        )
        if res.available:
            available_vehicles.append(v.vehicle_id)

    all_drivers = (
        db.query(User)
        .filter(User.role == "DRIVER")
        .all()
    )
    available_drivers = []
    for d in all_drivers:
        res = check_driver_availability(
            db=db,
            driver_id=d.user_id,
            start_time=start_time,
            end_time=end_time,
            exclude_shipment_id=exclude_shipment_id,
        )
        if res.available:
            available_drivers.append(d.user_id)

    return available_vehicles, available_drivers
