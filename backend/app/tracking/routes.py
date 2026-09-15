import os
from datetime import datetime

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.vehicle import Vehicle


load_dotenv()


router = APIRouter(
    prefix="/tracking",
    tags=["Tracking"],
)


GPS_INGEST_TOKEN = os.getenv("GPS_INGEST_TOKEN")


@router.get("/gps")
def receive_gps_location(
    vehicle_id: str = Query(..., min_length=3, max_length=20),
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    spd: float | None = Query(default=None, ge=0),
    dir: float | None = Query(default=None, ge=0, le=360),
    acc: float | None = Query(default=None, ge=0),
    alt: float | None = Query(default=None),
    token: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    if not GPS_INGEST_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="GPS ingestion token is not configured",
        )

    if token != GPS_INGEST_TOKEN:
        raise HTTPException(
            status_code=401,
            detail="Invalid GPS ingestion token",
        )

    vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.vehicle_id == vehicle_id)
        .first()
    )

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found",
        )

    vehicle.latitude = lat
    vehicle.longitude = lon
    vehicle.gps_speed = spd
    vehicle.gps_heading = dir
    vehicle.gps_accuracy = acc
    vehicle.gps_altitude = alt
    vehicle.last_gps_update = datetime.utcnow()

    vehicle.current_location = f"{lat:.6f}, {lon:.6f}"

    db.commit()
    db.refresh(vehicle)

    return {
        "status": "updated",
        "vehicle_id": vehicle.vehicle_id,
        "latitude": vehicle.latitude,
        "longitude": vehicle.longitude,
        "speed": vehicle.gps_speed,
        "heading": vehicle.gps_heading,
        "accuracy": vehicle.gps_accuracy,
        "altitude": vehicle.gps_altitude,
        "last_gps_update": vehicle.last_gps_update,
    }