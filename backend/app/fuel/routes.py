from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.database import get_db
from app.models import Alert, FuelRecord, Vehicle

from app.fuel.schemas import FuelCreate, FuelResponse, FuelUpdate


router = APIRouter(
    prefix="/fuel",
    tags=["Fuel"],
)

LOW_FUEL_THRESHOLD = 20.0


def update_low_fuel_alert(db: Session, vehicle: Vehicle):
    open_alerts = (
        db.query(Alert)
        .filter(
            Alert.alert_type == "LOW_FUEL",
            Alert.status == "OPEN",
        )
        .all()
    )

    vehicle_alert = next(
        (
            alert
            for alert in open_alerts
            if vehicle.vehicle_id in (alert.message or "")
        ),
        None,
    )

    if (
        vehicle.fuel_level is not None
        and vehicle.fuel_level <= LOW_FUEL_THRESHOLD
    ):
        if not vehicle_alert:
            db.add(
                Alert(
                    shipment_id=None,
                    alert_type="LOW_FUEL",
                    message=(
                        f"Vehicle {vehicle.vehicle_id} "
                        f"has low fuel: {vehicle.fuel_level:.1f}%"
                    ),
                    severity="HIGH",
                    status="OPEN",
                )
            )
        else:
            vehicle_alert.message = (
                f"Vehicle {vehicle.vehicle_id} "
                f"has low fuel: {vehicle.fuel_level:.1f}%"
            )
            vehicle_alert.severity = "HIGH"
    else:
        for alert in open_alerts:
            if vehicle.vehicle_id in (alert.message or ""):
                alert.status = "RESOLVED"
                alert.resolved_at = datetime.utcnow()


def validate_refill(
    vehicle: Vehicle,
    quantity: float,
):
    if quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fuel quantity must be greater than 0.",
        )

    tank = float(vehicle.fuel_tank_capacity or 0)
    current = float(vehicle.fuel_level or 0)

    if tank <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle fuel tank capacity must be configured.",
        )

    max_quantity = tank * max(0.0, (100.0 - current) / 100.0)

    if quantity > max_quantity + 0.000001:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Fuel quantity cannot exceed the remaining tank capacity "
                f"of {max_quantity:.1f} L."
            ),
        )


@router.post(
    "",
    response_model=FuelResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_fuel_record(
    fuel_data: FuelCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN", "MANAGER", "DISPATCHER")
    ),
):
    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.vehicle_id == fuel_data.vehicle_id)
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    # Fuel records are created only for the current date.
    fuel_record_date = fuel_data.fuel_date.date()
    today = datetime.now().date()

    if fuel_record_date != today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fuel date must be today's date.",
        )

    current_mileage = float(vehicle.mileage or 0)

    if abs(float(fuel_data.odometer_reading) - current_mileage) > 0.000001:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Odometer reading is automatically taken from the vehicle's "
                f"current mileage ({current_mileage:.2f} km)."
            ),
        )

    validate_refill(vehicle, fuel_data.quantity)

    # The post-refuel level is derived from the vehicle's current level,
    # tank capacity, and the quantity entered.
    current_fuel = float(vehicle.fuel_level or 0)
    tank_capacity = float(vehicle.fuel_tank_capacity or 0)
    calculated_fuel_level = min(
        100.0,
        current_fuel + (float(fuel_data.quantity) / tank_capacity) * 100.0,
    )

    if abs(float(fuel_data.fuel_level) - calculated_fuel_level) > 0.11:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "New fuel level is automatically calculated from the "
                "current fuel level, tank capacity, and refill quantity."
            ),
        )

    if fuel_data.fuel_type != vehicle.fuel_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Fuel type must match the vehicle's configured fuel type "
                f"({vehicle.fuel_type})."
            ),
        )

    fuel_record = FuelRecord(
        vehicle_id=fuel_data.vehicle_id,
        fuel_date=fuel_data.fuel_date,
        fuel_type=vehicle.fuel_type,
        quantity=fuel_data.quantity,
        cost_per_unit=fuel_data.cost_per_unit,
        total_cost=fuel_data.total_cost,
        odometer_reading=fuel_data.odometer_reading,
    )

    db.add(fuel_record)

    vehicle.fuel_level = fuel_data.fuel_level
    vehicle.mileage = fuel_data.odometer_reading

    db.add(vehicle)

    update_low_fuel_alert(db, vehicle)

    db.commit()
    db.refresh(fuel_record)

    return FuelResponse(
        fuel_id=fuel_record.fuel_id,
        vehicle_id=fuel_record.vehicle_id,
        fuel_date=fuel_record.fuel_date,
        fuel_type=fuel_record.fuel_type,
        quantity=fuel_record.quantity,
        cost_per_unit=fuel_record.cost_per_unit,
        total_cost=fuel_record.total_cost,
        odometer_reading=fuel_record.odometer_reading,
        fuel_level=vehicle.fuel_level,
    )


@router.get(
    "",
    response_model=list[FuelResponse],
)
def list_fuel_records(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN", "MANAGER", "DISPATCHER")
    ),
):
    records = (
        db.query(FuelRecord)
        .order_by(FuelRecord.fuel_date.desc())
        .all()
    )

    result = []

    for record in records:
        vehicle = (
            db.query(Vehicle)
            .filter(Vehicle.vehicle_id == record.vehicle_id)
            .first()
        )

        result.append(
            FuelResponse(
                fuel_id=record.fuel_id,
                vehicle_id=record.vehicle_id,
                fuel_date=record.fuel_date,
                fuel_type=record.fuel_type,
                quantity=record.quantity,
                cost_per_unit=record.cost_per_unit,
                total_cost=record.total_cost,
                odometer_reading=record.odometer_reading,
                fuel_level=(
                    vehicle.fuel_level
                    if vehicle and vehicle.fuel_level is not None
                    else 0
                ),
            )
        )

    return result


@router.get(
    "/{fuel_id}",
    response_model=FuelResponse,
)
def get_fuel_record(
    fuel_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN", "MANAGER", "DISPATCHER")
    ),
):
    fuel_record = (
        db.query(FuelRecord)
        .filter(FuelRecord.fuel_id == fuel_id)
        .first()
    )

    if not fuel_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fuel record not found",
        )

    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.vehicle_id == fuel_record.vehicle_id)
        .first()
    )

    return FuelResponse(
        fuel_id=fuel_record.fuel_id,
        vehicle_id=fuel_record.vehicle_id,
        fuel_date=fuel_record.fuel_date,
        fuel_type=fuel_record.fuel_type,
        quantity=fuel_record.quantity,
        cost_per_unit=fuel_record.cost_per_unit,
        total_cost=fuel_record.total_cost,
        odometer_reading=fuel_record.odometer_reading,
        fuel_level=vehicle.fuel_level if vehicle else 0,
    )


@router.put(
    "/{fuel_id}",
    response_model=FuelResponse,
)
def update_fuel_record(
    fuel_id: int,
    fuel_data: FuelUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles("ADMIN", "MANAGER", "DISPATCHER")
    ),
):
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Fuel records cannot be edited once created.",
    )
