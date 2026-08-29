from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.driver import Driver
from app.schemas.driver import DriverCreate, DriverResponse

router = APIRouter(prefix="/drivers", tags=["Driver Management"])


# Add Driver
@router.post("/", response_model=DriverResponse)
def add_driver(driver: DriverCreate, db: Session = Depends(get_db)):
    existing = db.query(Driver).filter(
        Driver.license_number == driver.license_number
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="License number already exists"
        )

    new_driver = Driver(
        name=driver.name,
        license_number=driver.license_number,
        phone=driver.phone,
        status=driver.status,
    )

    db.add(new_driver)
    db.commit()
    db.refresh(new_driver)

    return new_driver


# Get All Drivers
@router.get("/", response_model=list[DriverResponse])
def get_drivers(db: Session = Depends(get_db)):
    return db.query(Driver).all()


# Update Driver
@router.put("/{driver_id}", response_model=DriverResponse)
def update_driver(
    driver_id: int,
    driver: DriverCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(Driver).filter(Driver.id == driver_id).first()

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Driver not found"
        )

    existing.name = driver.name
    existing.license_number = driver.license_number
    existing.phone = driver.phone
    existing.status = driver.status

    db.commit()
    db.refresh(existing)

    return existing


# Delete Driver
@router.delete("/{driver_id}")
def delete_driver(driver_id: int, db: Session = Depends(get_db)):
    existing = db.query(Driver).filter(Driver.id == driver_id).first()

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Driver not found"
        )

    db.delete(existing)
    db.commit()

    return {"message": "Driver deleted successfully"}