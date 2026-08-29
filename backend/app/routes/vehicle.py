from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleResponse

router = APIRouter(prefix="/vehicles", tags=["Vehicle Management"])


@router.post("/", response_model=VehicleResponse)
def add_vehicle(vehicle: VehicleCreate, db: Session = Depends(get_db)):
    existing = db.query(Vehicle).filter(
        Vehicle.vehicle_number == vehicle.vehicle_number
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Vehicle already exists")

    new_vehicle = Vehicle(
        vehicle_number=vehicle.vehicle_number,
        model=vehicle.model,
        driver=vehicle.driver,
        status=vehicle.status,
    )

    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)

    return new_vehicle


@router.get("/", response_model=list[VehicleResponse])
def get_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).all()


@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(
    vehicle_id: int,
    vehicle: VehicleCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()

    if not existing:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    existing.vehicle_number = vehicle.vehicle_number
    existing.model = vehicle.model
    existing.driver = vehicle.driver
    existing.status = vehicle.status

    db.commit()
    db.refresh(existing)

    return existing


@router.delete("/{vehicle_id}")
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    existing = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()

    if not existing:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    db.delete(existing)
    db.commit()

    return {"message": "Vehicle deleted successfully"}