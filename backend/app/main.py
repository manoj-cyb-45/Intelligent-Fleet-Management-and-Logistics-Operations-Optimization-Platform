import os
import requests

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.auth.routes import router as auth_router
from app.users.routes import router as users_router
from app.vehicles.routes import router as vehicles_router
from app.drivers.routes import router as drivers_router
from app.shipments.routes import router as shipments_router
from app.alerts.routes import router as alerts_router
from app.maintenance.routes import router as maintenance_router
from app.fuel.routes import router as fuel_router

app = FastAPI(
    title="FleetFlow API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(vehicles_router)
app.include_router(drivers_router)
app.include_router(shipments_router)
app.include_router(alerts_router)
app.include_router(maintenance_router)
app.include_router(fuel_router)


@app.get("/health")
def health_check():
    return {"status": "healthy"}


class RouteRequest(BaseModel):
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    optimize_by: str = "time"


@app.post("/route-optimizer/optimize", tags=["Route Optimization"])
def optimize_route(data: RouteRequest):
    api_key = os.getenv("ORS_API_KEY")

    # Fallback response if API key is not configured
    if not api_key:
        return {
            "distance_km": 505.8,
            "duration_min": 470.5,
            "selected_route": data.optimize_by,
            "note": "Fallback response (ORS API key not configured)"
        }

    url = "https://api.openrouteservice.org/v2/directions/driving-car"

    headers = {
        "Authorization": api_key,
        "Content-Type": "application/json",
    }

    body = {
        "coordinates": [
            [data.start_lng, data.start_lat],
            [data.end_lng, data.end_lat],
        ],
        "alternative_routes": {
            "target_count": 3,
            "weight_factor": 1.4,
        },
    }

    r = requests.post(url, json=body, headers=headers)

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail="Routing failed")

    routes = r.json()["routes"]

    if data.optimize_by == "distance":
        best = min(routes, key=lambda x: x["summary"]["distance"])
    else:
        best = min(routes, key=lambda x: x["summary"]["duration"])

    return {
        "distance_km": round(best["summary"]["distance"] / 1000, 2),
        "duration_min": round(best["summary"]["duration"] / 60, 2),
        "selected_route": data.optimize_by,
    }


@app.post("/route-optimizer/recalculate", tags=["Route Optimization"])
def recalculate_route(data: RouteRequest):
    return optimize_route(data)