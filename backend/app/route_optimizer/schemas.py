from typing import Literal

from pydantic import BaseModel, Field


class RouteRequest(BaseModel):
    start_lat: float = Field(..., ge=-90, le=90)
    start_lng: float = Field(..., ge=-180, le=180)

    end_lat: float = Field(..., ge=-90, le=90)
    end_lng: float = Field(..., ge=-180, le=180)

    optimize_by: Literal["time", "distance"] = "time"

    traffic_level: Literal[
        "low",
        "moderate",
        "high",
        "severe",
    ] = "moderate"


class RouteResponse(BaseModel):
    distance_km: float
    duration_min: float
    optimize_by: str
    traffic_level: str
    traffic_adjusted_duration_min: float
    route: list[list[float]]