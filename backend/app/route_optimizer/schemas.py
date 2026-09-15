from pydantic import BaseModel

class RouteRequest(BaseModel):
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    optimize_by: str = "time"

class RouteResponse(BaseModel):
    distance_km: float
    duration_min: float
    selected_route: str