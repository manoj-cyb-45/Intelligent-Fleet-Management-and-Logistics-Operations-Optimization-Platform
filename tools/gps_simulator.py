#!/usr/bin/env python3
"""
FleetFlow GPS Simulator

Simulates a shipment moving along a real road route and sends GPS updates
through the existing authenticated FleetFlow shipment WebSocket.

Usage example:
    python tools/gps_simulator.py --shipment SHP001 --token "YOUR_JWT"

Optional:
    --origin Bengaluru --destination Tumakuru --interval 3

The script fetches the road geometry once from OSRM, then sends the route
coordinates and calculated route progress to FleetFlow at the requested
interval.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from typing import Iterable

from websockets.sync.client import connect
from websockets.exceptions import WebSocketException


# =========================================================
# CONFIGURATION
# =========================================================

WS_BASE_URL = "ws://127.0.0.1:8000"

OSRM_BASE_URL = (
    "https://router.project-osrm.org"
)


# =========================================================
# KNOWN CITY COORDINATES
# =========================================================

CITY_COORDINATES: dict[
    str,
    tuple[float, float],
] = {
    "bengaluru": (
        12.9716,
        77.5946,
    ),
    "bangalore": (
        12.9716,
        77.5946,
    ),
    "tumakuru": (
        13.3392,
        77.1130,
    ),
    "tumkur": (
        13.3392,
        77.1130,
    ),
    "chennai": (
        13.0827,
        80.2707,
    ),
    "hyderabad": (
        17.3850,
        78.4867,
    ),
    "mumbai": (
        19.0760,
        72.8777,
    ),
    "pune": (
        18.5204,
        73.8567,
    ),
    "delhi": (
        28.6139,
        77.2090,
    ),
    "jaipur": (
        26.9124,
        75.7873,
    ),
    "kochi": (
        9.9312,
        76.2673,
    ),
    "coimbatore": (
        11.0168,
        76.9558,
    ),
    "vijayawada": (
        16.5062,
        80.6480,
    ),
    "visakhapatnam": (
        17.6868,
        83.2185,
    ),
    "rajahmundry": (
        17.0005,
        81.8040,
    ),
    "mysuru": (
        12.2958,
        76.6394,
    ),
    "mysore": (
        12.2958,
        76.6394,
    ),
    "lonavala": (
        18.7546,
        73.4062,
    ),
}


# =========================================================
# LOCATION HELPERS
# =========================================================

def normalize_place(
    place: str,
) -> str:
    return (
        " "
        .join(
            place.strip()
            .lower()
            .replace(",", " ")
            .split()
        )
    )


def get_known_coordinates(
    place: str,
) -> tuple[float, float] | None:

    return CITY_COORDINATES.get(
        normalize_place(place)
    )


def geocode_place(
    place: str,
) -> tuple[float, float]:

    known = get_known_coordinates(
        place
    )

    if known:
        return known

    params = urllib.parse.urlencode(
        {
            "q": f"{place}, India",
            "format": "json",
            "limit": "1",
        }
    )

    url = (
        "https://nominatim.openstreetmap.org/"
        f"search?{params}"
    )

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "FleetFlow-GPS-Simulator/1.0"
            ),
            "Accept": "application/json",
        },
    )

    with urllib.request.urlopen(
        request,
        timeout=20,
    ) as response:

        results = json.loads(
            response.read().decode(
                "utf-8"
            )
        )

    if not results:
        raise RuntimeError(
            f"Location not found: {place}"
        )

    return (
        float(results[0]["lat"]),
        float(results[0]["lon"]),
    )


# =========================================================
# OSRM ROUTING
# =========================================================

def fetch_route(
    start: tuple[float, float],
    destination: tuple[float, float],
) -> tuple[
    list[tuple[float, float]],
    float,
    float,
]:

    start_lat, start_lon = start

    destination_lat, destination_lon = (
        destination
    )

    coordinates = (
        f"{start_lon},{start_lat};"
        f"{destination_lon},{destination_lat}"
    )

    params = urllib.parse.urlencode(
        {
            "overview": "full",
            "geometries": "geojson",
            "steps": "false",
        }
    )

    url = (
        f"{OSRM_BASE_URL}/route/v1/driving/"
        f"{coordinates}?{params}"
    )

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "FleetFlow-GPS-Simulator/1.0"
            ),
            "Accept": "application/json",
        },
    )

    with urllib.request.urlopen(
        request,
        timeout=30,
    ) as response:

        data = json.loads(
            response.read().decode(
                "utf-8"
            )
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

    route_coordinates = (
        route["geometry"]["coordinates"]
    )

    points = [
        (
            float(latitude),
            float(longitude),
        )
        for longitude, latitude
        in route_coordinates
    ]

    return (
        points,
        float(route["distance"]),
        float(route["duration"]),
    )


# =========================================================
# ROUTE SAMPLING
# =========================================================

def sample_route(
    points: list[tuple[float, float]],
    max_points: int,
) -> list[tuple[float, float]]:
    """
    Reduce a dense OSRM route to a manageable
    number of GPS updates.
    """

    if len(points) <= max_points:
        return points

    sampled: list[
        tuple[float, float]
    ] = []

    last_index = len(points) - 1

    for index in range(max_points):

        position = round(
            index
            * last_index
            / (max_points - 1)
        )

        sampled.append(
            points[position]
        )

    return sampled


# =========================================================
# WEBSOCKET GPS UPDATE
# =========================================================

def send_location(
    websocket,
    shipment_id: str,
    latitude: float,
    longitude: float,
    destination_name: str,
    progress: float,
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

        "current_location": (
            f"En route to {destination_name} "
            f"({progress:.0f}% route completed)"
        ),

        # IMPORTANT:
        # Send progress separately so the
        # FleetFlow backend can persist it.
        "progress": round(
            progress,
            2,
        ),
    }

    websocket.send(
        json.dumps(message)
    )

    print(
        f"[{shipment_id}] "
        f"GPS {latitude:.6f}, "
        f"{longitude:.6f} | "
        f"progress {progress:5.1f}%"
    )


# =========================================================
# RECEIVE SERVER MESSAGES
# =========================================================

def receive_messages(
    websocket,
) -> Iterable[dict]:
    """
    Read currently available server messages
    without blocking the simulation loop.
    """

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


# =========================================================
# COMMAND-LINE ARGUMENTS
# =========================================================

def parse_args() -> argparse.Namespace:

    parser = argparse.ArgumentParser(
        description=(
            "Simulate FleetFlow "
            "shipment GPS movement."
        )
    )

    parser.add_argument(
        "--shipment",
        required=True,
        help=(
            "FleetFlow shipment ID, "
            "for example SHP001"
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
        "--origin",
        default="Bengaluru",
        help=(
            "Starting location. "
            "Default: Bengaluru"
        ),
    )

    parser.add_argument(
        "--destination",
        default="Tumakuru",
        help=(
            "Destination. "
            "Default: Tumakuru"
        ),
    )

    parser.add_argument(
        "--interval",
        type=float,
        default=3.0,
        help=(
            "Seconds between GPS updates. "
            "Default: 3"
        ),
    )

    parser.add_argument(
        "--max-points",
        type=int,
        default=80,
        help=(
            "Maximum simulated GPS points. "
            "Default: 80"
        ),
    )

    return parser.parse_args()


# =========================================================
# MAIN
# =========================================================

def main() -> int:

    args = parse_args()

    token = args.token

    if not token:
        token = os.getenv(
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
            "ERROR: --interval must "
            "be greater than 0."
        )

        return 1

    if args.max_points < 2:

        print(
            "ERROR: --max-points must "
            "be at least 2."
        )

        return 1

    try:

        # =================================================
        # DISPLAY CONFIGURATION
        # =================================================

        print(
            "FleetFlow GPS Simulator"
        )

        print(
            "=" * 26
        )

        print(
            f"Shipment:    {args.shipment}"
        )

        print(
            f"Origin:      {args.origin}"
        )

        print(
            f"Destination: {args.destination}"
        )

        print(
            f"Interval:    {args.interval:g}s"
        )

        print()

        # =================================================
        # RESOLVE LOCATIONS
        # =================================================

        print(
            "Resolving locations..."
        )

        start = geocode_place(
            args.origin
        )

        destination = geocode_place(
            args.destination
        )

        print(
            f"Start:       "
            f"{start[0]:.6f}, "
            f"{start[1]:.6f}"
        )

        print(
            f"Destination: "
            f"{destination[0]:.6f}, "
            f"{destination[1]:.6f}"
        )

        # =================================================
        # FETCH ROUTE
        # =================================================

        print(
            "Fetching road route from OSRM..."
        )

        route, distance_meters, duration_seconds = (
            fetch_route(
                start,
                destination,
            )
        )

        route = sample_route(
            route,
            args.max_points,
        )

        print(
            f"Route:       "
            f"{distance_meters / 1000:.1f} km | "
            f"OSRM ETA: "
            f"{duration_seconds / 60:.0f} min"
        )

        print(
            f"GPS points:  "
            f"{len(route)}"
        )

        print()

        # =================================================
        # BUILD WEBSOCKET URL
        # =================================================

        websocket_url = (
            f"{WS_BASE_URL}/shipments/ws/"
            f"{urllib.parse.quote(args.shipment, safe='')}"
            f"?token="
            f"{urllib.parse.quote(token, safe='')}"
        )

        print(
            "Connecting to FleetFlow WebSocket..."
        )

        # =================================================
        # CONNECT
        # =================================================

        with connect(
            websocket_url,
            open_timeout=10,
            close_timeout=5,
        ) as websocket:

            print(
                "Connected."
            )

            print(
                "Starting GPS simulation. "
                "Press Ctrl+C to stop."
            )

            print()

            # =================================================
            # SEND GPS POINTS
            # =================================================

            for index, (
                latitude,
                longitude,
            ) in enumerate(route):

                progress = (
                    index
                    / (len(route) - 1)
                ) * 100

                send_location(
                    websocket,
                    args.shipment,
                    latitude,
                    longitude,
                    args.destination,
                    progress,
                )

                # =================================================
                # READ BACKEND CONFIRMATION
                # =================================================

                for message in receive_messages(
                    websocket
                ):

                    if (
                        message.get(
                            "type"
                        )
                        == "location_updated"
                    ):

                        server_progress = (
                            message.get(
                                "delivery_progress"
                            )
                        )

                        server_status = (
                            message.get(
                                "status"
                            )
                        )

                        print(
                            "  Server confirmed: "
                            f"{message.get('latitude')}, "
                            f"{message.get('longitude')} | "
                            f"status={server_status} | "
                            f"progress="
                            f"{server_progress}%"
                        )

                if index < len(route) - 1:
                    time.sleep(
                        args.interval
                    )

            print()

            print(
                "Simulation completed successfully."
            )

            print(
                "Final shipment location reached."
            )

            return 0

    except KeyboardInterrupt:

        print(
            "\nSimulation stopped by user."
        )

        return 0

    except (
        OSError,
        WebSocketException,
    ) as error:

        print(
            f"ERROR: WebSocket connection failed: "
            f"{error}"
        )

        return 1

    except Exception as error:

        print(
            f"ERROR: {error}"
        )

        return 1


if __name__ == "__main__":
    sys.exit(
        main()
    )