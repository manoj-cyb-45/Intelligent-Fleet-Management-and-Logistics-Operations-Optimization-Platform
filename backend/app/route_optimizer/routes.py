import os
import requests
from fastapi import APIRouter, HTTPException
from .schemas import RouteRequest

router = APIRouter(prefix="/route-optimizer", tags=["Route Optimization"])

ORS_API_KEY = os.getenv("ORS_API_KEY")

@router.post("/optimize")
def optimize_route(data: RouteRequest):

    if not ORS_API_KEY:
        raise HTTPException(status_code=500, detail="ORS_API_KEY missing")

    url = "https://api.openrouteservice.org/v2/directions/driving-car"

    headers = {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json"
    }

    body = {
        "coordinates": [
            [data.start_lng, data.start_lat],
            [data.end_lng, data.end_lat]
        ],
        "alternative_routes": {
            "target_count": 3,
            "weight_factor": 1.4
        }
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
        "selected_route": data.optimize_by
    }

@router.post("/recalculate")
def recalculate_route(data: RouteRequest):
    return optimize_route(data)