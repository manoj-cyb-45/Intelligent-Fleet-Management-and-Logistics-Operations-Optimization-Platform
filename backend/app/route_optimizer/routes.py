import logging
from typing import Any

import requests
from fastapi import APIRouter, HTTPException

from .schemas import RouteRequest, RouteResponse


router = APIRouter(
    prefix="/route-optimizer",
    tags=["Route Optimization"],
)

logger = logging.getLogger(__name__)

OSRM_BASE_URL = "https://router.project-osrm.org"


# Traffic impact factors used by FleetFlow's traffic-aware
# routing heuristic. OSRM itself does not provide live traffic.
TRAFFIC_FACTORS = {
    "low": 1.00,
    "moderate": 1.15,
    "high": 1.35,
    "severe": 1.60,
}


def fetch_osrm_routes(
    start: tuple[float, float],
    destination: tuple[float, float],
) -> list[dict[str, Any]]:
    """
    Fetch alternative driving routes from the public OSRM service.

    Coordinates are supplied as:
        (latitude, longitude)
    """

    start_lat, start_lng = start
    end_lat, end_lng = destination

    coordinates = (
        f"{start_lng},{start_lat};"
        f"{end_lng},{end_lat}"
    )

    url = (
        f"{OSRM_BASE_URL}/route/v1/driving/"
        f"{coordinates}"
    )

    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "false",
        "alternatives": "true",
    }

    try:
        response = requests.get(
            url,
            params=params,
            timeout=30,
            headers={
                "User-Agent": "FleetFlow-Route-Optimizer/1.0",
                "Accept": "application/json",
            },
        )

        response.raise_for_status()
        data = response.json()

    except requests.RequestException as exc:
        logger.exception("OSRM request failed")

        raise HTTPException(
            status_code=502,
            detail=f"OSRM routing service unavailable: {exc}",
        ) from exc

    except ValueError as exc:
        logger.exception(
            "Invalid response received from OSRM"
        )

        raise HTTPException(
            status_code=502,
            detail="Invalid response received from OSRM.",
        ) from exc

    if data.get("code") != "Ok":
        raise HTTPException(
            status_code=400,
            detail=data.get(
                "message",
                "OSRM could not find a route.",
            ),
        )

    routes = data.get("routes", [])

    if not routes:
        raise HTTPException(
            status_code=404,
            detail="No driving route found.",
        )

    return routes


def get_traffic_factor(
    traffic_level: str,
) -> float:
    """
    Return the traffic multiplier for the supplied
    FleetFlow traffic condition.
    """

    return TRAFFIC_FACTORS.get(
        traffic_level,
        TRAFFIC_FACTORS["moderate"],
    )


def calculate_traffic_adjusted_duration(
    duration_seconds: float,
    traffic_level: str,
) -> float:
    """
    Apply the FleetFlow traffic heuristic to the
    OSRM travel-time estimate.
    """

    factor = get_traffic_factor(
        traffic_level
    )

    return duration_seconds * factor


def select_optimal_route(
    routes: list[dict[str, Any]],
    optimize_by: str,
    traffic_level: str,
) -> dict[str, Any]:
    """
    Select the optimal route.

    distance:
        Select the route with the lowest road distance.

    time:
        Select the route with the lowest traffic-adjusted
        travel duration.
    """

    if optimize_by == "distance":
        return min(
            routes,
            key=lambda route: float(
                route.get(
                    "distance",
                    float("inf"),
                )
            ),
        )

    return min(
        routes,
        key=lambda route: calculate_traffic_adjusted_duration(
            float(
                route.get(
                    "duration",
                    float("inf"),
                )
            ),
            traffic_level,
        ),
    )


def build_route_response(
    route: dict[str, Any],
    optimize_by: str,
    traffic_level: str,
) -> RouteResponse:
    """
    Convert an OSRM route into the FleetFlow API
    response format.
    """

    geometry = route.get(
        "geometry",
        {},
    )

    coordinates = geometry.get(
        "coordinates",
        [],
    )

    if not coordinates:
        raise HTTPException(
            status_code=502,
            detail="OSRM returned a route without geometry.",
        )

    # OSRM GeoJSON coordinates are:
    # [longitude, latitude]
    #
    # FleetFlow returns:
    # [latitude, longitude]
    route_points = [
        [
            float(latitude),
            float(longitude),
        ]
        for longitude, latitude in coordinates
    ]

    distance_meters = float(
        route.get(
            "distance",
            0,
        )
    )

    duration_seconds = float(
        route.get(
            "duration",
            0,
        )
    )

    traffic_adjusted_seconds = (
        calculate_traffic_adjusted_duration(
            duration_seconds,
            traffic_level,
        )
    )

    return RouteResponse(
        distance_km=round(
            distance_meters / 1000,
            2,
        ),
        duration_min=round(
            duration_seconds / 60,
            2,
        ),
        optimize_by=optimize_by,
        traffic_level=traffic_level,
        traffic_adjusted_duration_min=round(
            traffic_adjusted_seconds / 60,
            2,
        ),
        route=route_points,
    )


@router.post(
    "/optimize",
    response_model=RouteResponse,
)
def optimize_route(
    request: RouteRequest,
) -> RouteResponse:
    """
    Generate and optimize a road route between
    two locations using OSRM.
    """

    routes = fetch_osrm_routes(
        start=(
            request.start_lat,
            request.start_lng,
        ),
        destination=(
            request.end_lat,
            request.end_lng,
        ),
    )

    optimal_route = select_optimal_route(
        routes=routes,
        optimize_by=request.optimize_by,
        traffic_level=request.traffic_level,
    )

    return build_route_response(
        route=optimal_route,
        optimize_by=request.optimize_by,
        traffic_level=request.traffic_level,
    )


@router.post(
    "/recalculate",
    response_model=RouteResponse,
)
def recalculate_route(
    request: RouteRequest,
) -> RouteResponse:
    """
    Recalculate a route from the vehicle's current
    GPS position to the destination.
    """

    routes = fetch_osrm_routes(
        start=(
            request.start_lat,
            request.start_lng,
        ),
        destination=(
            request.end_lat,
            request.end_lng,
        ),
    )

    optimal_route = select_optimal_route(
        routes=routes,
        optimize_by=request.optimize_by,
        traffic_level=request.traffic_level,
    )

    return build_route_response(
        route=optimal_route,
        optimize_by=request.optimize_by,
        traffic_level=request.traffic_level,
    )