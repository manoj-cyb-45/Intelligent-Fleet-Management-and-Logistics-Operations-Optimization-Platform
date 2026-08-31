from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.database import get_db
from app.models import Alert, FuelRecord, Vehicle

from app.fuel.schemas import (
    FuelCreate,
    FuelResponse,
    FuelUpdate,
)


router = APIRouter(
    prefix="/fuel",
    tags=["Fuel"],
)


LOW_FUEL_THRESHOLD = 20.0


# =========================================================
# HELPER - BUILD RESPONSE
# =========================================================

def build_fuel_response(record: FuelRecord):
    return FuelResponse(
        fuel_id=record.fuel_id,
        vehicle_id=record.vehicle_id,
        fuel_date=record.fuel_date,
        fuel_type=record.fuel_type,
        quantity=record.quantity,
        cost_per_unit=record.cost_per_unit,
        total_cost=record.total_cost,
        odometer_reading=record.odometer_reading,
        fuel_level=(
            record.vehicle.fuel_level
            if hasattr(record, "vehicle") and record.vehicle
            else None
        ),
    )


# =========================================================
# LOW FUEL ALERT HANDLER
# =========================================================

def update_low_fuel_alert(
    db: Session,
    vehicle: Vehicle,
):
    """
    Creates a LOW_FUEL alert when fuel is <= 20%.

    If the vehicle is no longer low on fuel,
    any OPEN LOW_FUEL alerts for that vehicle
    are automatically resolved.
    """

    low_fuel_alerts = (
        db.query(Alert)
        .filter(
            Alert.alert_type == "LOW_FUEL",
            Alert.status == "OPEN",
        )
        .all()
    )

    vehicle_alert = None

    for alert in low_fuel_alerts:

        message = alert.message or ""

        if vehicle.vehicle_id in message:
            vehicle_alert = alert
            break

    # =====================================================
    # LOW FUEL
    # =====================================================

    if (
        vehicle.fuel_level is not None
        and vehicle.fuel_level <= LOW_FUEL_THRESHOLD
    ):

        if not vehicle_alert:

            alert = Alert(
                shipment_id=None,
                alert_type="LOW_FUEL",
                message=(
                    f"Vehicle {vehicle.vehicle_id} "
                    f"has low fuel: "
                    f"{vehicle.fuel_level:.1f}%"
                ),
                severity="HIGH",
                status="OPEN",
            )

            db.add(alert)

        else:

            vehicle_alert.message = (
                f"Vehicle {vehicle.vehicle_id} "
                f"has low fuel: "
                f"{vehicle.fuel_level:.1f}%"
            )

            vehicle_alert.severity = "HIGH"

            db.add(vehicle_alert)

    # =====================================================
    # FUEL NORMAL
    # =====================================================

    else:

        for alert in low_fuel_alerts:

            message = alert.message or ""

            if vehicle.vehicle_id in message:

                alert.status = "RESOLVED"

                from datetime import datetime

                alert.resolved_at = datetime.utcnow()

                db.add(alert)


# =========================================================
# CREATE FUEL RECORD
# =========================================================

@router.post(
    "",
    response_model=FuelResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_fuel_record(
    fuel_data: FuelCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):

    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id == fuel_data.vehicle_id
        )
        .first()
    )

    if not vehicle:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    # =====================================================
    # ODOMETER VALIDATION
    # =====================================================

    if (
        vehicle.mileage is not None
        and fuel_data.odometer_reading < vehicle.mileage
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Odometer reading cannot be lower "
                "than the vehicle's current mileage"
            ),
        )

    # =====================================================
    # CREATE FUEL RECORD
    # =====================================================

    fuel_record = FuelRecord(
        vehicle_id=fuel_data.vehicle_id,
        fuel_date=fuel_data.fuel_date,
        fuel_type=fuel_data.fuel_type,
        quantity=fuel_data.quantity,
        cost_per_unit=fuel_data.cost_per_unit,
        total_cost=fuel_data.total_cost,
        odometer_reading=fuel_data.odometer_reading,
    )

    db.add(fuel_record)

    # =====================================================
    # UPDATE VEHICLE
    # =====================================================

    vehicle.fuel_level = fuel_data.fuel_level

    vehicle.mileage = fuel_data.odometer_reading

    db.add(vehicle)

    # =====================================================
    # LOW FUEL ALERT
    # =====================================================

    update_low_fuel_alert(
        db,
        vehicle,
    )

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


# =========================================================
# LIST FUEL RECORDS
# =========================================================

@router.get(
    "",
    response_model=list[FuelResponse],
)
def list_fuel_records(
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
        db.query(FuelRecord)
        .order_by(
            FuelRecord.fuel_date.desc()
        )
        .all()
    )

    result = []

    for record in records:

        vehicle = (
            db.query(Vehicle)
            .filter(
                Vehicle.vehicle_id == record.vehicle_id
            )
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
                    if vehicle
                    and vehicle.fuel_level is not None
                    else 0
                ),
            )
        )

    return result


# =========================================================
# GET FUEL RECORD
# =========================================================

@router.get(
    "/{fuel_id}",
    response_model=FuelResponse,
)
def get_fuel_record(
    fuel_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):

    fuel_record = (
        db.query(FuelRecord)
        .filter(
            FuelRecord.fuel_id == fuel_id
        )
        .first()
    )

    if not fuel_record:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fuel record not found",
        )

    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id
            == fuel_record.vehicle_id
        )
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
        fuel_level=(
            vehicle.fuel_level
            if vehicle
            else 0
        ),
    )


# =========================================================
# UPDATE FUEL RECORD
# =========================================================

@router.put(
    "/{fuel_id}",
    response_model=FuelResponse,
)
def update_fuel_record(
    fuel_id: int,
    fuel_data: FuelUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Fuel records cannot be edited once created.",
    )

    fuel_record = (
        db.query(FuelRecord)
        .filter(
            FuelRecord.fuel_id == fuel_id
        )
        .first()
    )

    if not fuel_record:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fuel record not found",
        )

    new_vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id
            == fuel_data.vehicle_id
        )
        .first()
    )

    if not new_vehicle:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    # =====================================================
    # ODOMETER VALIDATION
    # =====================================================

    if (
        new_vehicle.mileage is not None
        and fuel_data.odometer_reading
        < new_vehicle.mileage
        and fuel_record.vehicle_id
        == fuel_data.vehicle_id
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Odometer reading cannot be lower "
                "than the vehicle's current mileage"
            ),
        )

    # =====================================================
    # OLD VEHICLE
    # =====================================================

    old_vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_id
            == fuel_record.vehicle_id
        )
        .first()
    )

    # =====================================================
    # UPDATE RECORD
    # =====================================================

    fuel_record.vehicle_id = fuel_data.vehicle_id

    fuel_record.fuel_date = fuel_data.fuel_date

    fuel_record.fuel_type = fuel_data.fuel_type

    fuel_record.quantity = fuel_data.quantity

    fuel_record.cost_per_unit = (
        fuel_data.cost_per_unit
    )

    fuel_record.total_cost = (
        fuel_data.total_cost
    )

    fuel_record.odometer_reading = (
        fuel_data.odometer_reading
    )

    db.add(fuel_record)

    # =====================================================
    # UPDATE NEW VEHICLE
    # =====================================================

    new_vehicle.fuel_level = (
        fuel_data.fuel_level
    )

    new_vehicle.mileage = (
        fuel_data.odometer_reading
    )

    db.add(new_vehicle)

    # =====================================================
    # IF VEHICLE WAS CHANGED
    # =====================================================

    if (
        old_vehicle
        and old_vehicle.vehicle_id
        != new_vehicle.vehicle_id
    ):

        latest_old_record = (
            db.query(FuelRecord)
            .filter(
                FuelRecord.vehicle_id
                == old_vehicle.vehicle_id
            )
            .order_by(
                FuelRecord.fuel_date.desc()
            )
            .first()
        )

        if latest_old_record:

            old_vehicle.mileage = (
                latest_old_record.odometer_reading
            )

        else:

            old_vehicle.mileage = None

        db.add(old_vehicle)

    # =====================================================
    # LOW FUEL ALERT
    # =====================================================

    update_low_fuel_alert(
        db,
        new_vehicle,
    )

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
        fuel_level=new_vehicle.fuel_level,
    )