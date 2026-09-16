#!/usr/bin/env python3
"""
FleetFlow GPS Simulator

Shipment-aware, road-based GPS simulator for FleetFlow Milestone 2.

The simulator reads the shipment's stored origin/destination coordinates
instead of using hardcoded route locations. It can simulate one shipment
or all active shipments concurrently.

Examples:
    python tools/gps_simulator.py --shipment SH020 --token "YOUR_JWT"

    python tools/gps_simulator.py --all-active --token "YOUR_JWT"

Optional:
    --speed-multiplier 15
    --interval 5
    --max-points 500

The simulator:
    - reads shipment data from FleetFlow
    - uses stored origin/destination coordinates
    - follows an OSRM road route
    - moves according to road distance/time rather than point count
    - sends smooth GPS updates through the authenticated WebSocket
    - sends cumulative travelled distance for vehicle mileage/fuel updates
    - periodically reverse-geocodes the GPS position for current_location
    - supports multiple active shipments simultaneously
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import threading
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Iterable

from websockets.exceptions import WebSocketException
from websockets.sync.client import connect


WS_BASE_URL = "ws://127.0.0.1:8000"
HTTP_BASE_URL = "http://127.0.0.1:8000"
OSRM_BASE_URL = "https://router.project-osrm.org"
NOMINATIM_URL = "https://nominatim.openstreetmap.org"

DEFAULT_INTERVAL = 5.0
DEFAULT_SPEED_MULTIPLIER = 15.0
DEFAULT_MAX_POINTS = 500
DEFAULT_LOCATION_REFRESH = 30.0

ACTIVE_STATUSES = {
    "CREATED",
    "ASSIGNED",
    "IN_TRANSIT",
    "DELAYED",
    "PENDING",
}


@dataclass
class ShipmentData:
    shipment_id: str
    tracking_number: str
    origin: str
    destination: str
    vehicle_id: str | None
    driver_id: str | None
    origin_latitude: float
    origin_longitude: float
    destination_latitude: float
    destination_longitude: float
    latitude: float | None
    longitude: float | None
    status: str
    delivery_progress: float


@dataclass
class RouteData:
    points: list[tuple[float, float]]
    cumulative_meters: list[float]
    distance_meters: float
    duration_seconds: float


def normalize_status(value: object) -> str:
    return str(value or "").strip().upper()


def http_get_json(
    url: str,
    token: str,
) -> object:
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "User-Agent": "FleetFlow-GPS-Simulator/2.0",
        },
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def load_shipment(
    shipment_id: str,
    token: str,
) -> ShipmentData:
    encoded_id = urllib.parse.quote(
        shipment_id,
        safe="",
    )

    data = http_get_json(
        f"{HTTP_BASE_URL}/shipments/{encoded_id}",
        token,
    )

    if not isinstance(data, dict):
        raise RuntimeError(
            f"Invalid shipment response for {shipment_id}."
        )

    required = [
        "origin_latitude",
        "origin_longitude",
        "destination_latitude",
        "destination_longitude",
    ]

    missing = [
        field
        for field in required
        if data.get(field) is None
    ]

    if missing:
        raise RuntimeError(
            f"Shipment {shipment_id} is missing stored "
            f"route coordinates: {', '.join(missing)}"
        )

    return ShipmentData(
        shipment_id=str(
            data.get("shipment_id") or shipment_id
        ),
        tracking_number=str(
            data.get("tracking_number") or ""
        ),
        origin=str(
            data.get("origin") or "Origin"
        ),
        destination=str(
            data.get("destination") or "Destination"
        ),
        vehicle_id=(
            str(data["vehicle_id"])
            if data.get("vehicle_id") is not None
            else None
        ),
        driver_id=(
            str(data["driver_id"])
            if data.get("driver_id") is not None
            else None
        ),
        origin_latitude=float(
            data["origin_latitude"]
        ),
        origin_longitude=float(
            data["origin_longitude"]
        ),
        destination_latitude=float(
            data["destination_latitude"]
        ),
        destination_longitude=float(
            data["destination_longitude"]
        ),
        latitude=(
            float(data["latitude"])
            if data.get("latitude") is not None
            else None
        ),
        longitude=(
            float(data["longitude"])
            if data.get("longitude") is not None
            else None
        ),
        status=normalize_status(
            data.get("status")
        ),
        delivery_progress=float(
            data.get("delivery_progress") or 0.0
        ),
    )


def load_active_shipments(
    token: str,
) -> list[ShipmentData]:
    data = http_get_json(
        f"{HTTP_BASE_URL}/shipments",
        token,
    )

    if not isinstance(data, list):
        raise RuntimeError(
            "Invalid /shipments response."
        )

    shipments: list[ShipmentData] = []

    for item in data:
        if not isinstance(item, dict):
            continue

        status = normalize_status(
            item.get("status")
        )

        if status not in ACTIVE_STATUSES:
            continue

        shipment_id = item.get("shipment_id")

        if not shipment_id:
            continue

        try:
            shipments.append(
                load_shipment(
                    str(shipment_id),
                    token,
                )
            )
        except Exception as error:
            print(
                f"[{shipment_id}] Skipped: {error}"
            )

    return shipments


def fetch_route(
    start: tuple[float, float],
    destination: tuple[float, float],
) -> RouteData:
    start_lat, start_lon = start
    destination_lat, destination_lon = destination

    coordinates = (
        f"{start_lon},{start_lat};"
        f"{destination_lon},{destination_lat}"
    )

    params = urllib.parse.urlencode(
        {
            "overview": "full",
            "geometries": "geojson",
            "steps": "false",
            "alternatives": "false",
        }
    )

    url = (
        f"{OSRM_BASE_URL}/route/v1/driving/"
        f"{coordinates}?{params}"
    )

    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "FleetFlow-GPS-Simulator/2.0",
        },
    )

    with urllib.request.urlopen(
        request,
        timeout=30,
    ) as response:
        data = json.loads(
            response.read().decode("utf-8")
        )

    if (
        data.get("code") != "Ok"
        or not data.get("routes")
    ):
        raise RuntimeError(
            data.get(
                "message",
                "OSRM could not find a route.",
            )
        )

    route = data["routes"][0]

    raw_coordinates = (
        route["geometry"]["coordinates"]
    )

    points = [
        (
            float(latitude),
            float(longitude),
        )
        for longitude, latitude in raw_coordinates
    ]

    if len(points) < 2:
        raise RuntimeError(
            "OSRM returned an unusable route."
        )

    cumulative = [0.0]

    for index in range(1, len(points)):
        cumulative.append(
            cumulative[-1]
            + haversine_meters(
                points[index - 1],
                points[index],
            )
        )

    geometry_distance = cumulative[-1]

    osrm_distance = float(
        route["distance"]
    )

    # Prefer OSRM's route distance for ETA reporting.
    # Geometry distance is used for interpolation.
    distance_meters = (
        osrm_distance
        if osrm_distance > 0
        else geometry_distance
    )

    duration_seconds = float(
        route["duration"]
    )

    if duration_seconds <= 0:
        raise RuntimeError(
            "OSRM returned an invalid route duration."
        )

    return RouteData(
        points=points,
        cumulative_meters=cumulative,
        distance_meters=distance_meters,
        duration_seconds=duration_seconds,
    )


def haversine_meters(
    first: tuple[float, float],
    second: tuple[float, float],
) -> float:
    latitude1, longitude1 = map(
        math.radians,
        first,
    )
    latitude2, longitude2 = map(
        math.radians,
        second,
    )

    d_latitude = latitude2 - latitude1
    d_longitude = longitude2 - longitude1

    value = (
        math.sin(d_latitude / 2) ** 2
        + math.cos(latitude1)
        * math.cos(latitude2)
        * math.sin(d_longitude / 2) ** 2
    )

    value = min(
        1.0,
        max(0.0, value),
    )

    return (
        2
        * 6371000.0
        * math.asin(math.sqrt(value))
    )


def interpolate_route(
    route: RouteData,
    distance_meters: float,
) -> tuple[float, float]:
    distance_meters = max(
        0.0,
        min(
            route.cumulative_meters[-1],
            distance_meters,
        ),
    )

    cumulative = route.cumulative_meters

    left = 0
    right = len(cumulative) - 1

    while left < right:
        middle = (left + right) // 2

        if cumulative[middle] < distance_meters:
            left = middle + 1
        else:
            right = middle

    index = max(
        1,
        left,
    )

    previous_distance = cumulative[index - 1]
    next_distance = cumulative[index]

    segment_length = (
        next_distance
        - previous_distance
    )

    if segment_length <= 0:
        return route.points[index]

    ratio = (
        distance_meters
        - previous_distance
    ) / segment_length

    previous_point = route.points[index - 1]
    next_point = route.points[index]

    latitude = (
        previous_point[0]
        + (
            next_point[0]
            - previous_point[0]
        )
        * ratio
    )

    longitude = (
        previous_point[1]
        + (
            next_point[1]
            - previous_point[1]
        )
        * ratio
    )

    return latitude, longitude


def reverse_geocode(
    latitude: float,
    longitude: float,
) -> str | None:
    params = urllib.parse.urlencode(
        {
            "lat": f"{latitude:.6f}",
            "lon": f"{longitude:.6f}",
            "format": "json",
            "zoom": "10",
            "addressdetails": "1",
        }
    )

    url = (
        f"{NOMINATIM_URL}/reverse?{params}"
    )

    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "FleetFlow-GPS-Simulator/2.0",
        },
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=15,
        ) as response:
            data = json.loads(
                response.read().decode("utf-8")
            )
    except Exception:
        return None

    address = data.get("address") or {}

    for key in (
        "city",
        "town",
        "municipality",
        "village",
        "suburb",
        "county",
    ):
        value = address.get(key)

        if value:
            return str(value)

    display_name = data.get(
        "display_name"
    )

    if display_name:
        return str(display_name).split(
            ","
        )[0].strip()

    return None


def send_location(
    websocket,
    shipment: ShipmentData,
    latitude: float,
    longitude: float,
    progress: float,
    total_distance_km: float,
    current_location: str,
) -> None:
    progress = max(
        0.0,
        min(
            100.0,
            float(progress),
        ),
    )

    message = {
        "type": "location_update",
        "latitude": round(
            latitude,
            6,
        ),
        "longitude": round(
            longitude,
            6,
        ),
        "current_location": current_location,
        "progress": round(
            progress,
            2,
        ),
        "total_distance_km": round(
            total_distance_km,
            3,
        ),
    }

    websocket.send(
        json.dumps(message)
    )

    print(
        f"[{shipment.shipment_id}] "
        f"GPS {latitude:.6f}, "
        f"{longitude:.6f} | "
        f"progress {progress:5.1f}% | "
        f"distance {total_distance_km:7.2f} km | "
        f"{current_location}"
    )


def receive_messages(
    websocket,
) -> Iterable[dict]:
    try:
        while True:
            raw_message = websocket.recv(
                timeout=0.05
            )

            if raw_message is None:
                return

            try:
                yield json.loads(
                    raw_message
                )
            except json.JSONDecodeError:
                print(
                    f"Server message: "
                    f"{raw_message}"
                )

    except TimeoutError:
        return

    except WebSocketException:
        return


def build_websocket_url(
    shipment_id: str,
    token: str,
) -> str:
    encoded_id = urllib.parse.quote(
        shipment_id,
        safe="",
    )

    encoded_token = urllib.parse.quote(
        token,
        safe="",
    )

    return (
        f"{WS_BASE_URL}/shipments/ws/"
        f"{encoded_id}"
        f"?token={encoded_token}"
    )


def simulate_shipment(
    shipment: ShipmentData,
    token: str,
    interval: float,
    speed_multiplier: float,
    max_points: int,
    location_refresh: float,
) -> None:
    print()
    print(
        f"[{shipment.shipment_id}] "
        f"{shipment.origin} -> "
        f"{shipment.destination}"
    )

    print(
        f"[{shipment.shipment_id}] "
        f"Vehicle: {shipment.vehicle_id or 'Unassigned'} | "
        f"Driver: {shipment.driver_id or 'Unassigned'}"
    )

    start = (
        shipment.origin_latitude,
        shipment.origin_longitude,
    )

    destination = (
        shipment.destination_latitude,
        shipment.destination_longitude,
    )

    print(
        f"[{shipment.shipment_id}] "
        f"Using stored shipment coordinates:"
    )

    print(
        f"  Origin:      "
        f"{start[0]:.6f}, {start[1]:.6f}"
    )

    print(
        f"  Destination: "
        f"{destination[0]:.6f}, "
        f"{destination[1]:.6f}"
    )

    print(
        f"[{shipment.shipment_id}] "
        f"Fetching road route from OSRM..."
    )

    route = fetch_route(
        start,
        destination,
    )

    geometry_distance = (
        route.cumulative_meters[-1]
    )

    # Limit the number of updates without changing
    # the physical route. The movement itself remains
    # time-based and smooth.
    estimated_updates = max(
        2,
        min(
            max_points,
            math.ceil(
                (
                    route.duration_seconds
                    / speed_multiplier
                )
                / interval
            )
            + 1,
        ),
    )

    simulated_duration = (
        route.duration_seconds
        / speed_multiplier
    )

    print(
        f"[{shipment.shipment_id}] "
        f"Route: {route.distance_meters / 1000:.1f} km | "
        f"OSRM travel time: "
        f"{route.duration_seconds / 60:.0f} min"
    )

    print(
        f"[{shipment.shipment_id}] "
        f"Simulation speed: "
        f"{speed_multiplier:g}x | "
        f"demo duration: "
        f"{simulated_duration / 60:.1f} min"
    )

    print(
        f"[{shipment.shipment_id}] "
        f"GPS interval: {interval:g}s | "
        f"updates: {estimated_updates}"
    )

    websocket_url = build_websocket_url(
        shipment.shipment_id,
        token,
    )

    print(
        f"[{shipment.shipment_id}] "
        f"Connecting to FleetFlow WebSocket..."
    )

    with connect(
        websocket_url,
        open_timeout=10,
        close_timeout=5,
    ) as websocket:
        print(
            f"[{shipment.shipment_id}] Connected."
        )

        print(
            f"[{shipment.shipment_id}] "
            f"Starting natural road movement."
        )

        simulation_start = time.monotonic()
        next_update = simulation_start
        last_location_lookup = (
            simulation_start
            - location_refresh
        )

        current_location = (
            shipment.origin
        )

        sent_updates = 0

        while True:
            now = time.monotonic()

            if now < next_update:
                time.sleep(
                    min(
                        0.25,
                        next_update - now,
                    )
                )
                continue

            elapsed_real = (
                now - simulation_start
            )

            elapsed_simulated = (
                elapsed_real
                * speed_multiplier
            )

            progress = min(
                1.0,
                elapsed_simulated
                / route.duration_seconds,
            )

            distance_meters = (
                geometry_distance
                * progress
            )

            latitude, longitude = (
                interpolate_route(
                    route,
                    distance_meters,
                )
            )

            # Do not hammer Nominatim. Refresh the
            # human-readable current location periodically.
            if (
                now - last_location_lookup
                >= location_refresh
            ):
                place = reverse_geocode(
                    latitude,
                    longitude,
                )

                if place:
                    current_location = (
                        f"Near {place}"
                    )

                last_location_lookup = now

            if progress >= 1.0:
                latitude = (
                    shipment.destination_latitude
                )
                longitude = (
                    shipment.destination_longitude
                )

                current_location = (
                    shipment.destination
                )

            send_location(
                websocket,
                shipment,
                latitude,
                longitude,
                progress * 100.0,
                distance_meters / 1000.0,
                current_location,
            )

            sent_updates += 1

            for message in receive_messages(
                websocket
            ):
                message_type = message.get(
                    "type"
                )

                if message_type == "tracking_connected":
                    continue

                if message_type == "location_updated":
                    print(
                        f"  [{shipment.shipment_id}] "
                        f"Server: "
                        f"status={message.get('status')} | "
                        f"progress="
                        f"{message.get('delivery_progress')}% | "
                        f"location="
                        f"{message.get('current_location')}"
                    )

                elif message_type == "error":
                    print(
                        f"  [{shipment.shipment_id}] "
                        f"Server error: "
                        f"{message.get('message')}"
                    )

            if progress >= 1.0:
                break

            # Recalculate the next update from the
            # simulation clock so slow network/reverse
            # geocoding calls do not make movement jump.
            next_update = (
                simulation_start
                + (
                    elapsed_simulated
                    / speed_multiplier
                )
                + interval
            )

        print(
            f"[{shipment.shipment_id}] "
            f"Simulation completed."
        )

        print(
            f"[{shipment.shipment_id}] "
            f"Final location: {shipment.destination}"
        )

        print(
            f"[{shipment.shipment_id}] "
            f"Final progress: 100%"
        )

        print(
            f"[{shipment.shipment_id}] "
            f"GPS updates sent: {sent_updates}"
        )


def worker(
    shipment: ShipmentData,
    token: str,
    interval: float,
    speed_multiplier: float,
    max_points: int,
    location_refresh: float,
) -> None:
    try:
        simulate_shipment(
            shipment=shipment,
            token=token,
            interval=interval,
            speed_multiplier=speed_multiplier,
            max_points=max_points,
            location_refresh=location_refresh,
        )
    except KeyboardInterrupt:
        print(
            f"[{shipment.shipment_id}] "
            f"Simulation stopped."
        )
    except (
        OSError,
        WebSocketException,
    ) as error:
        print(
            f"[{shipment.shipment_id}] "
            f"WebSocket error: {error}"
        )
    except Exception as error:
        print(
            f"[{shipment.shipment_id}] "
            f"ERROR: {error}"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "FleetFlow shipment-aware GPS simulator."
        )
    )

    group = parser.add_mutually_exclusive_group(
        required=True
    )

    group.add_argument(
        "--shipment",
        help=(
            "Simulate one shipment, "
            "for example SH020."
        ),
    )

    group.add_argument(
        "--all-active",
        action="store_true",
        help=(
            "Simulate all active shipments "
            "concurrently."
        ),
    )

    parser.add_argument(
        "--token",
        default=None,
        help=(
            "FleetFlow JWT. "
            "You can also set FLEETFLOW_TOKEN."
        ),
    )

    parser.add_argument(
        "--interval",
        type=float,
        default=DEFAULT_INTERVAL,
        help=(
            f"Real seconds between GPS updates. "
            f"Default: {DEFAULT_INTERVAL:g}"
        ),
    )

    parser.add_argument(
        "--speed-multiplier",
        type=float,
        default=DEFAULT_SPEED_MULTIPLIER,
        help=(
            "Simulation speed relative to OSRM travel time. "
            f"Default: {DEFAULT_SPEED_MULTIPLIER:g}x"
        ),
    )

    parser.add_argument(
        "--max-points",
        type=int,
        default=DEFAULT_MAX_POINTS,
        help=(
            f"Maximum GPS updates per shipment. "
            f"Default: {DEFAULT_MAX_POINTS}"
        ),
    )

    parser.add_argument(
        "--location-refresh",
        type=float,
        default=DEFAULT_LOCATION_REFRESH,
        help=(
            "Seconds between reverse-geocoding lookups. "
            f"Default: {DEFAULT_LOCATION_REFRESH:g}"
        ),
    )

    return parser.parse_args()


def main() -> int:
    args = parse_args()

    token = args.token or os.getenv(
        "FLEETFLOW_TOKEN"
    )

    if not token:
        print(
            "ERROR: JWT token is required. "
            "Use --token or set FLEETFLOW_TOKEN."
        )
        return 1

    if args.interval <= 0:
        print(
            "ERROR: --interval must be greater than 0."
        )
        return 1

    if args.speed_multiplier <= 0:
        print(
            "ERROR: --speed-multiplier must be "
            "greater than 0."
        )
        return 1

    if args.max_points < 2:
        print(
            "ERROR: --max-points must be at least 2."
        )
        return 1

    if args.location_refresh < 10:
        print(
            "ERROR: --location-refresh must be "
            "at least 10 seconds."
        )
        return 1

    try:
        print(
            "FleetFlow GPS Simulator 2.0"
        )
        print(
            "=" * 30
        )

        if args.all_active:
            print(
                "Mode:        ALL ACTIVE SHIPMENTS"
            )

            shipments = load_active_shipments(
                token
            )

            if not shipments:
                print(
                    "No active shipments found."
                )
                return 0

            print(
                f"Shipments:   {len(shipments)}"
            )

            for shipment in shipments:
                print(
                    f"  {shipment.shipment_id}: "
                    f"{shipment.origin} -> "
                    f"{shipment.destination}"
                )

            print()
            print(
                "Starting concurrent simulations..."
            )

            threads: list[threading.Thread] = []

            for shipment in shipments:
                thread = threading.Thread(
                    target=worker,
                    args=(
                        shipment,
                        token,
                        args.interval,
                        args.speed_multiplier,
                        args.max_points,
                        args.location_refresh,
                    ),
                    daemon=True,
                )

                threads.append(thread)
                thread.start()

            try:
                for thread in threads:
                    thread.join()
            except KeyboardInterrupt:
                print(
                    "\nStopping all simulations..."
                )

            print()
            print(
                "All shipment simulations finished."
            )

            return 0

        shipment = load_shipment(
            args.shipment,
            token,
        )

        worker(
            shipment,
            token,
            args.interval,
            args.speed_multiplier,
            args.max_points,
            args.location_refresh,
        )

        return 0

    except KeyboardInterrupt:
        print(
            "\nSimulation stopped by user."
        )
        return 0

    except Exception as error:
        print(
            f"ERROR: {error}"
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())
