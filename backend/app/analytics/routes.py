from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.analytics.schemas import (
    DeliveryPerformance,
    DriverPerformance,
    FleetPerformance,
    FleetUtilization,
    FuelAnalytics,
    FuelConsumptionReport,
    OperationalAnalytics,
)
from app.auth.dependencies import require_roles
from app.database.database import get_db
from app.models import (
    FuelRecord,
    Shipment,
    Trip,
    User,
    Vehicle,
)


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


# =========================================================
# OPERATIONAL ANALYTICS
# =========================================================

@router.get(
    "/operational",
    response_model=OperationalAnalytics,
)
def operational_analytics(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):
    trips = db.query(Trip).all()

    total = len(trips)

    scheduled = sum(
        trip.status == "SCHEDULED"
        for trip in trips
    )

    in_progress = sum(
        trip.status == "IN_PROGRESS"
        for trip in trips
    )

    completed = sum(
        trip.status == "COMPLETED"
        for trip in trips
    )

    cancelled = sum(
        trip.status == "CANCELLED"
        for trip in trips
    )

    completion_rate = (
        (completed / total) * 100
        if total > 0
        else 0.0
    )

    return OperationalAnalytics(
        total_trips=total,
        scheduled_trips=scheduled,
        in_progress_trips=in_progress,
        completed_trips=completed,
        cancelled_trips=cancelled,
        completion_rate=round(
            completion_rate,
            2,
        ),
    )


# =========================================================
# FLEET PERFORMANCE
# =========================================================

@router.get(
    "/fleet-performance",
    response_model=FleetPerformance,
)
def fleet_performance(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):
    vehicles = db.query(Vehicle).all()

    total = len(vehicles)

    available = sum(
        vehicle.current_status == "AVAILABLE"
        for vehicle in vehicles
    )

    active = sum(
        vehicle.current_status in {
            "ASSIGNED",
            "IN_TRANSIT",
        }
        for vehicle in vehicles
    )

    maintenance = sum(
        vehicle.current_status == "MAINTENANCE"
        for vehicle in vehicles
    )

    mileages = [
        float(vehicle.mileage)
        for vehicle in vehicles
        if vehicle.mileage is not None
    ]

    fuel_levels = [
        float(vehicle.fuel_level)
        for vehicle in vehicles
        if vehicle.fuel_level is not None
    ]

    average_mileage = (
        sum(mileages) / len(mileages)
        if mileages
        else 0.0
    )

    average_fuel_level = (
        sum(fuel_levels) / len(fuel_levels)
        if fuel_levels
        else 0.0
    )

    return FleetPerformance(
        total_vehicles=total,
        available_vehicles=available,
        active_vehicles=active,
        maintenance_vehicles=maintenance,
        average_mileage=round(
            average_mileage,
            2,
        ),
        average_fuel_level=round(
            average_fuel_level,
            2,
        ),
    )


# =========================================================
# FUEL MONITORING ANALYTICS
# =========================================================

@router.get(
    "/fuel",
    response_model=FuelAnalytics,
)
def fuel_analytics(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):
    records = db.query(FuelRecord).all()

    total_quantity = sum(
        float(record.quantity)
        for record in records
    )

    total_cost = sum(
        float(record.total_cost)
        for record in records
    )

    average_cost_per_unit = (
        total_cost / total_quantity
        if total_quantity > 0
        else 0.0
    )

    return FuelAnalytics(
        total_records=len(records),
        total_quantity=round(
            total_quantity,
            2,
        ),
        total_cost=round(
            total_cost,
            2,
        ),
        average_cost_per_unit=round(
            average_cost_per_unit,
            2,
        ),
    )


# =========================================================
# FLEET UTILIZATION
# =========================================================

@router.get(
    "/fleet-utilization",
    response_model=FleetUtilization,
)
def fleet_utilization(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):
    vehicles = db.query(Vehicle).all()

    total_vehicles = len(vehicles)

    trips = (
        db.query(Trip)
        .filter(
            Trip.status.in_(
                [
                    "SCHEDULED",
                    "IN_PROGRESS",
                    "COMPLETED",
                ]
            )
        )
        .all()
    )

    utilized_vehicle_ids = {
        trip.vehicle_id
        for trip in trips
    }

    utilized_vehicles = len(
        utilized_vehicle_ids
    )

    utilization_rate = (
        (
            utilized_vehicles
            / total_vehicles
        ) * 100
        if total_vehicles > 0
        else 0.0
    )

    return FleetUtilization(
        total_vehicles=total_vehicles,
        utilized_vehicles=utilized_vehicles,
        utilization_rate=round(
            utilization_rate,
            2,
        ),
    )


# =========================================================
# FUEL CONSUMPTION REPORT
# =========================================================

@router.get(
    "/fuel-consumption",
    response_model=list[FuelConsumptionReport],
)
def fuel_consumption_report(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):
    vehicles = db.query(Vehicle).all()

    result = []

    for vehicle in vehicles:
        records = (
            db.query(FuelRecord)
            .filter(
                FuelRecord.vehicle_id
                == vehicle.vehicle_id
            )
            .all()
        )

        total_quantity = sum(
            float(record.quantity)
            for record in records
        )

        total_cost = sum(
            float(record.total_cost)
            for record in records
        )

        result.append(
            FuelConsumptionReport(
                vehicle_id=vehicle.vehicle_id,
                total_quantity=round(
                    total_quantity,
                    2,
                ),
                total_cost=round(
                    total_cost,
                    2,
                ),
                fuel_records=len(records),
            )
        )

    return result


# =========================================================
# DRIVER PERFORMANCE REPORT
# =========================================================

@router.get(
    "/driver-performance",
    response_model=list[DriverPerformance],
)
def driver_performance(
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
        .all()
    )

    result = []

    for driver in drivers:
        trips = (
            db.query(Trip)
            .filter(
                Trip.driver_id
                == driver.user_id
            )
            .all()
        )

        total = len(trips)

        completed = sum(
            trip.status == "COMPLETED"
            for trip in trips
        )

        cancelled = sum(
            trip.status == "CANCELLED"
            for trip in trips
        )

        completion_rate = (
            (completed / total) * 100
            if total > 0
            else 0.0
        )

        result.append(
            DriverPerformance(
                driver_id=driver.user_id,
                total_trips=total,
                completed_trips=completed,
                cancelled_trips=cancelled,
                completion_rate=round(
                    completion_rate,
                    2,
                ),
            )
        )

    return result


# =========================================================
# DELIVERY PERFORMANCE
# =========================================================

@router.get(
    "/delivery-performance",
    response_model=DeliveryPerformance,
)
def delivery_performance(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):
    shipments = db.query(Shipment).all()

    total = len(shipments)

    delivered = sum(
        shipment.status == "DELIVERED"
        for shipment in shipments
    )

    in_transit = sum(
        shipment.status == "IN_TRANSIT"
        for shipment in shipments
    )

    pending = sum(
        shipment.status == "PENDING"
        for shipment in shipments
    )

    cancelled = sum(
        shipment.status == "CANCELLED"
        for shipment in shipments
    )

    delivery_rate = (
        (delivered / total) * 100
        if total > 0
        else 0.0
    )

    return DeliveryPerformance(
        total_shipments=total,
        delivered_shipments=delivered,
        in_transit_shipments=in_transit,
        pending_shipments=pending,
        cancelled_shipments=cancelled,
        delivery_rate=round(
            delivery_rate,
            2,
        ),
    )