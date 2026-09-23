from __future__ import annotations

import asyncio
import math
import os
import time
from datetime import datetime
from typing import Any

import requests

from app.database.database import SessionLocal
from app.models import (
    Alert,
    DriverVehicleAssignment,
    Shipment,
    ShipmentHistory,
    Trip,
    User,
    Vehicle,
)
from app.models.trip import Trip
from app.shipments.websocket import shipment_connection_manager


OSRM_BASE_URL = "https://router.project-osrm.org"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"

GPS_INTERVAL_SECONDS = float(os.getenv("FLEETFLOW_SIMULATION_INTERVAL", "10"))
SIMULATION_SPEED_MULTIPLIER = float(os.getenv("FLEETFLOW_SIMULATION_SPEED", "5"))
LOCATION_REFRESH_SECONDS = float(
    os.getenv("FLEETFLOW_SIMULATION_LOCATION_REFRESH", "60")
)
FUEL_PERCENT_PER_100KM = float(
    os.getenv("FLEETFLOW_SIMULATION_FUEL_PER_100KM", "1.2")
)

ACTIVE_STATUSES = {"CREATED", "ASSIGNED", "IN_TRANSIT", "DELAYED"}
TERMINAL_STATUSES = {"DELIVERED", "CANCELLED"}
USER_AGENT = "FleetFlow/1.0"


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    value = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )
    return 6371.0088 * 2 * math.asin(math.sqrt(value))


def route_cumulative_km(points: list[tuple[float, float]]) -> list[float]:
    result = [0.0]
    for index in range(1, len(points)):
        result.append(result[-1] + haversine_km(points[index - 1], points[index]))
    return result


def route_position(
    points: list[tuple[float, float]],
    cumulative: list[float],
    distance_km: float,
) -> tuple[float, float]:
    if not points:
        raise RuntimeError("OSRM returned an empty route.")
    if len(points) == 1 or distance_km <= 0:
        return points[0]
    if distance_km >= cumulative[-1]:
        return points[-1]

    for index in range(1, len(points)):
        if distance_km <= cumulative[index]:
            start_distance = cumulative[index - 1]
            segment_distance = cumulative[index] - start_distance
            if segment_distance <= 0:
                return points[index]

            fraction = (distance_km - start_distance) / segment_distance
            lat1, lon1 = points[index - 1]
            lat2, lon2 = points[index]
            return (
                lat1 + (lat2 - lat1) * fraction,
                lon1 + (lon2 - lon1) * fraction,
            )

    return points[-1]


def fetch_route(
    start: tuple[float, float],
    destination: tuple[float, float],
) -> tuple[list[tuple[float, float]], float, float]:
    start_lat, start_lon = start
    destination_lat, destination_lon = destination

    coordinates = (
        f"{start_lon},{start_lat};"
        f"{destination_lon},{destination_lat}"
    )

    response = requests.get(
        f"{OSRM_BASE_URL}/route/v1/driving/{coordinates}",
        params={
            "overview": "full",
            "geometries": "geojson",
            "steps": "false",
        },
        headers={"User-Agent": USER_AGENT},
        timeout=30,
    )
    response.raise_for_status()

    data = response.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        raise RuntimeError(data.get("message", "OSRM could not find a route."))

    route = data["routes"][0]
    points = [
        (float(lat), float(lon))
        for lon, lat in route["geometry"]["coordinates"]
    ]

    return (
        points,
        float(route["distance"]) / 1000.0,
        float(route["duration"]),
    )


def geocode_location(location: str) -> tuple[float, float] | None:
    if not location or not location.strip():
        return None

    try:
        response = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": " ".join(location.strip().split()),
                "format": "json",
                "limit": 1,
            },
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        response.raise_for_status()
        results = response.json()
        if not results:
            return None
        return float(results[0]["lat"]), float(results[0]["lon"])
    except (requests.RequestException, KeyError, TypeError, ValueError):
        return None


def reverse_geocode(latitude: float, longitude: float) -> str | None:
    try:
        response = requests.get(
            NOMINATIM_REVERSE_URL,
            params={
                "lat": latitude,
                "lon": longitude,
                "format": "json",
                "zoom": 10,
                "addressdetails": 1,
            },
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        response.raise_for_status()
        address = response.json().get("address") or {}

        locality = (
            address.get("city")
            or address.get("town")
            or address.get("municipality")
            or address.get("village")
            or address.get("county")
            or address.get("state_district")
        )

        return f"Near {locality}" if locality else None
    except requests.RequestException:
        return None


class AutomaticShipmentSimulator:
    def __init__(self) -> None:
        self._manager_task: asyncio.Task | None = None
        self._shipment_tasks: dict[str, asyncio.Task] = {}
        self._stopping = False

    async def start(self) -> None:
        if self._manager_task and not self._manager_task.done():
            return

        self._stopping = False
        self._manager_task = asyncio.create_task(self._manager_loop())

        print(
            "[FleetFlow Simulator] Automatic movement enabled: "
            f"{GPS_INTERVAL_SECONDS:g}s interval, "
            f"{SIMULATION_SPEED_MULTIPLIER:g}x simulation speed."
        )

    async def stop(self) -> None:
        self._stopping = True

        if self._manager_task:
            self._manager_task.cancel()
            try:
                await self._manager_task
            except asyncio.CancelledError:
                pass
            self._manager_task = None

        tasks = list(self._shipment_tasks.values())
        for task in tasks:
            task.cancel()

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

        self._shipment_tasks.clear()

    async def _manager_loop(self) -> None:
        while not self._stopping:
            try:
                active_ids = await asyncio.to_thread(self._active_shipment_ids)
                active_set = set(active_ids)

                for shipment_id in active_ids:
                    task = self._shipment_tasks.get(shipment_id)
                    if task is None or task.done():
                        self._shipment_tasks[shipment_id] = asyncio.create_task(
                            self._shipment_loop(shipment_id)
                        )

                for shipment_id, task in list(self._shipment_tasks.items()):
                    if shipment_id not in active_set or task.done():
                        if shipment_id not in active_set:
                            task.cancel()
                        self._shipment_tasks.pop(shipment_id, None)

            except asyncio.CancelledError:
                raise
            except Exception as error:
                print(f"[FleetFlow Simulator] Manager error: {error}")

            await asyncio.sleep(5)

    @staticmethod
    def _active_shipment_ids() -> list[str]:
        db = SessionLocal()

        try:
            shipments = (
                db.query(Shipment)
                .filter(
                    Shipment.status.in_(ACTIVE_STATUSES)
                )
                .all()
            )

            active_ids = []

            for shipment in shipments:
                trip = (
                    db.query(Trip)
                    .filter(
                        Trip.shipment_id
                        == shipment.shipment_id
                    )
                    .order_by(
                        Trip.created_at.desc()
                    )
                    .first()
                )

                # =================================================
                # TRIP CONTROL
                # =================================================
                #
                # Shipment movement is controlled by its Trip.
                #
                # No Trip
                #     -> DO NOT MOVE
                #
                # SCHEDULED
                #     -> DO NOT MOVE
                #
                # IN_PROGRESS
                #     -> START GPS MOVEMENT
                #
                # COMPLETED / CANCELLED
                #     -> DO NOT MOVE
                # =================================================

                if not trip:
                    continue

                if trip.status != "IN_PROGRESS":
                    continue

                active_ids.append(
                    shipment.shipment_id
                )

            return active_ids

        finally:
            db.close()

    @staticmethod
    def _load_state(shipment_id: str) -> dict[str, Any] | None:
        db = SessionLocal()
        try:
            shipment = (
                db.query(Shipment)
                .filter(Shipment.shipment_id == shipment_id)
                .first()
            )
            if not shipment or shipment.status in TERMINAL_STATUSES:
                return None

            # Repair legacy shipments created before route coordinates
            # were stored. The shipment's own origin/destination remain
            # the source of truth.
            if (
                shipment.origin_latitude is None
                or shipment.origin_longitude is None
            ):
                origin_coords = geocode_location(shipment.origin)
                if origin_coords:
                    shipment.origin_latitude = origin_coords[0]
                    shipment.origin_longitude = origin_coords[1]

            if (
                shipment.destination_latitude is None
                or shipment.destination_longitude is None
            ):
                destination_coords = geocode_location(shipment.destination)
                if destination_coords:
                    shipment.destination_latitude = destination_coords[0]
                    shipment.destination_longitude = destination_coords[1]

            if (
                shipment.origin_latitude is None
                or shipment.origin_longitude is None
                or shipment.destination_latitude is None
                or shipment.destination_longitude is None
            ):
                db.rollback()
                return None

            # Repair legacy one-sided assignment records so Drivers,
            # Vehicles and Shipments read the same relationship.
            if shipment.vehicle_id and shipment.driver_id:
                vehicle = (
                    db.query(Vehicle)
                    .filter(Vehicle.vehicle_id == shipment.vehicle_id)
                    .first()
                )
                driver = (
                    db.query(User)
                    .filter(
                        User.user_id == shipment.driver_id,
                        User.role == "DRIVER",
                    )
                    .first()
                )
                if vehicle and driver:
                    vehicle_assignment = (
                        db.query(DriverVehicleAssignment)
                        .filter(
                            DriverVehicleAssignment.vehicle_id == vehicle.vehicle_id,
                            DriverVehicleAssignment.status == "ACTIVE",
                        )
                        .first()
                    )
                    driver_assignment = (
                        db.query(DriverVehicleAssignment)
                        .filter(
                            DriverVehicleAssignment.driver_id == driver.user_id,
                            DriverVehicleAssignment.status == "ACTIVE",
                        )
                        .first()
                    )
                    if (
                        not vehicle_assignment
                        and not driver_assignment
                        and vehicle.current_status != "MAINTENANCE"
                    ):
                        db.add(
                            DriverVehicleAssignment(
                                driver_id=driver.user_id,
                                vehicle_id=vehicle.vehicle_id,
                                start_date=datetime.utcnow(),
                                status="ACTIVE",
                            )
                        )
                        if vehicle.current_status not in {"IN_TRANSIT", "MAINTENANCE"}:
                            vehicle.current_status = "ASSIGNED"
                    elif (
                        vehicle_assignment
                        and vehicle_assignment.driver_id == driver.user_id
                    ):
                        if vehicle.current_status not in {"IN_TRANSIT", "MAINTENANCE"}:
                            vehicle.current_status = "ASSIGNED"
                    elif (
                        driver_assignment
                        and driver_assignment.vehicle_id == vehicle.vehicle_id
                    ):
                        if vehicle.current_status not in {"IN_TRANSIT", "MAINTENANCE"}:
                            vehicle.current_status = "ASSIGNED"

            db.commit()

            if (
                shipment.latitude is not None
                and shipment.longitude is not None
                and not (
                    float(shipment.latitude) == 0.0
                    and float(shipment.longitude) == 0.0
                )
                and float(shipment.delivery_progress) > 0
            ):
                start = (float(shipment.latitude), float(shipment.longitude))
            else:
                start = (
                    float(shipment.origin_latitude),
                    float(shipment.origin_longitude),
                )

            return {
                "status": shipment.status,
                "origin": shipment.origin,
                "destination_name": shipment.destination,
                "start": start,
                "destination": (
                    float(shipment.destination_latitude),
                    float(shipment.destination_longitude),
                ),
                "progress": float(shipment.delivery_progress),
                "current_location": shipment.current_location,
                "vehicle_id": shipment.vehicle_id,
                "tracking_number": shipment.tracking_number,
            }
        finally:
            db.close()

    async def _shipment_loop(self, shipment_id: str) -> None:
        try:
            state = await asyncio.to_thread(self._load_state, shipment_id)
            if not state:
                return

            points, route_km, route_seconds = await asyncio.to_thread(
                fetch_route,
                state["start"],
                state["destination"],
            )
            cumulative = route_cumulative_km(points)

            if route_km <= 0 or route_seconds <= 0:
                return

            start_progress = max(0.0, min(100.0, state["progress"]))
            last_target_km = 0.0
            last_location_refresh = 0.0
            last_tick = time.monotonic()
            simulated_seconds = 0.0

            print(
                f"[FleetFlow Simulator] {shipment_id}: "
                f"{state['origin']} -> {state['destination_name']} | "
                f"resume {start_progress:.1f}% | "
                f"route {route_km:.1f} km"
            )

            while not self._stopping:
                current = await asyncio.to_thread(
                    self._load_state,
                    shipment_id,
                )
                if not current or current["status"] in TERMINAL_STATUSES:
                    return

                now = time.monotonic()
                simulated_seconds += (
                    now - last_tick
                ) * SIMULATION_SPEED_MULTIPLIER
                last_tick = now

                fraction = min(
                    1.0,
                    simulated_seconds / max(route_seconds, 1.0),
                )
                target_km = route_km * fraction
                delta_km = max(0.0, target_km - last_target_km)
                last_target_km = target_km

                latitude, longitude = route_position(
                    points,
                    cumulative,
                    target_km,
                )

                progress = start_progress + (
                    100.0 - start_progress
                ) * fraction

                reached_destination = fraction >= 1.0
                if reached_destination:
                    latitude, longitude = current["destination"]
                    progress = 100.0

                location = current["current_location"]

                if (
                    not location
                    or time.monotonic() - last_location_refresh
                    >= LOCATION_REFRESH_SECONDS
                ):
                    resolved = await asyncio.to_thread(
                        reverse_geocode,
                        latitude,
                        longitude,
                    )
                    if resolved:
                        location = resolved
                        last_location_refresh = time.monotonic()

                update = await asyncio.to_thread(
                    self._persist_tick,
                    shipment_id,
                    latitude,
                    longitude,
                    progress,
                    location,
                    delta_km,
                    reached_destination,
                )

                if not update:
                    return

                await shipment_connection_manager.broadcast(
                    shipment_id,
                    update,
                )

                if reached_destination:
                    return

                await asyncio.sleep(max(1.0, GPS_INTERVAL_SECONDS))

        except asyncio.CancelledError:
            raise
        except Exception as error:
            print(
                f"[FleetFlow Simulator] "
                f"{shipment_id} stopped: {error}"
            )

    @staticmethod
    def _sync_alerts(
        db: Session,
        shipment: Shipment,
        vehicle: Vehicle | None,
    ) -> None:
        if vehicle and vehicle.fuel_level is not None:
            fuel_alert = (
                db.query(Alert)
                .filter(
                    Alert.alert_type == "LOW_FUEL",
                    Alert.status == "OPEN",
                )
                .all()
            )
            matching = next(
                (
                    alert
                    for alert in fuel_alert
                    if vehicle.vehicle_id in (alert.message or "")
                ),
                None,
            )

            if float(vehicle.fuel_level) <= 20.0:
                if matching:
                    matching.message = (
                        f"Vehicle {vehicle.vehicle_id} has low fuel: "
                        f"{float(vehicle.fuel_level):.1f}%"
                    )
                    matching.severity = "HIGH"
                else:
                    db.add(
                        Alert(
                            shipment_id=None,
                            alert_type="LOW_FUEL",
                            message=(
                                f"Vehicle {vehicle.vehicle_id} has low fuel: "
                                f"{float(vehicle.fuel_level):.1f}%"
                            ),
                            severity="HIGH",
                            status="OPEN",
                            created_at=datetime.utcnow(),
                        )
                    )
            elif matching:
                matching.status = "RESOLVED"
                matching.resolved_at = datetime.utcnow()

        delayed_alert = (
            db.query(Alert)
            .filter(
                Alert.shipment_id == shipment.shipment_id,
                Alert.alert_type == "SHIPMENT_DELAYED",
                Alert.status == "OPEN",
            )
            .first()
        )

        if shipment.status == "DELAYED":
            if not delayed_alert:
                db.add(
                    Alert(
                        shipment_id=shipment.shipment_id,
                        alert_type="SHIPMENT_DELAYED",
                        message=(
                            f"Shipment {shipment.shipment_id} "
                            f"has been marked as delayed"
                        ),
                        severity="HIGH",
                        status="OPEN",
                        created_at=datetime.utcnow(),
                    )
                )
        elif shipment.status == "DELIVERED" and delayed_alert:
            delayed_alert.status = "RESOLVED"
            delayed_alert.resolved_at = datetime.utcnow()

    @staticmethod
    def _persist_tick(
        shipment_id: str,
        latitude: float,
        longitude: float,
        progress: float,
        location: str | None,
        delta_km: float,
        reached_destination: bool,
    ) -> dict[str, Any] | None:
        db = SessionLocal()
        try:
            shipment = (
                db.query(Shipment)
                .filter(Shipment.shipment_id == shipment_id)
                .first()
            )
            if not shipment or shipment.status in TERMINAL_STATUSES:
                return None

            old_status = shipment.status

            if shipment.status in {"CREATED", "ASSIGNED"}:
                shipment.status = "IN_TRANSIT"
                shipment.started_at = shipment.started_at or datetime.utcnow()

            shipment.latitude = latitude
            shipment.longitude = longitude
            if location:
                shipment.current_location = location

            shipment.delivery_progress = max(
                float(shipment.delivery_progress),
                min(100.0, float(progress)),
            )

            vehicle = (
                db.query(Vehicle)
                .filter(Vehicle.vehicle_id == shipment.vehicle_id)
                .first()
            )

            if vehicle:
                vehicle.latitude = latitude
                vehicle.longitude = longitude
                vehicle.current_location = (
                    shipment.current_location or shipment.origin
                )
                vehicle.current_status = "IN_TRANSIT"
                vehicle.last_gps_update = datetime.utcnow()

                if delta_km > 0:
                    vehicle.mileage = float(vehicle.mileage or 0.0) + delta_km

                    current_fuel = (
                        100.0
                        if vehicle.fuel_level is None
                        else float(vehicle.fuel_level)
                    )
                    fuel_used = (
                        delta_km
                        * FUEL_PERCENT_PER_100KM
                        / 100.0
                    )
                    vehicle.fuel_level = max(
                        0.0,
                        current_fuel - fuel_used,
                    )

            if reached_destination:
                shipment.delivery_progress = 100.0
                shipment.status = "DELIVERED"
                shipment.current_location = shipment.destination
                shipment.delivered_at = (
                    shipment.delivered_at or datetime.utcnow()
                )

                # -------------------------------------------------
                # COMPLETE LINKED TRIP
                # -------------------------------------------------

                trip = (
                    db.query(Trip)
                    .filter(
                        Trip.shipment_id == shipment.shipment_id,
                        Trip.status == "IN_PROGRESS",
                    )
                    .order_by(Trip.created_at.desc())
                    .first()
                )

                if trip:
                    trip.status = "COMPLETED"
                    trip.actual_arrival = (
                        trip.actual_arrival or datetime.utcnow()
                    )
                    trip.updated_at = datetime.utcnow()

                if vehicle:
                    vehicle.current_status = "AVAILABLE"

            shipment.updated_at = datetime.utcnow()

            latest = (
                db.query(ShipmentHistory)
                .filter(ShipmentHistory.shipment_id == shipment_id)
                .order_by(ShipmentHistory.event_time.desc())
                .first()
            )

            description = None

            if reached_destination:
                description = "Shipment delivered"
            elif shipment.status != old_status:
                description = f"Shipment status changed to {shipment.status}"
            else:
                milestone = int(shipment.delivery_progress // 10) * 10
                milestone_exists = (
                    db.query(ShipmentHistory.history_id)
                    .filter(
                        ShipmentHistory.shipment_id == shipment_id,
                        ShipmentHistory.description
                        == f"GPS milestone {milestone}%",
                    )
                    .first()
                    is not None
                )
                if milestone >= 10 and not milestone_exists:
                    description = f"GPS milestone {milestone}%"

            if description:
                db.add(
                    ShipmentHistory(
                        shipment_id=shipment_id,
                        status=shipment.status,
                        location=shipment.current_location or shipment.origin,
                        event_time=datetime.utcnow(),
                        description=description,
                    )
                )

            AutomaticShipmentSimulator._sync_alerts(
                db,
                shipment,
                vehicle,
            )

            db.commit()
            db.refresh(shipment)

            return {
                "type": "location_updated",
                "shipment_id": shipment.shipment_id,
                "tracking_number": shipment.tracking_number,
                "latitude": shipment.latitude,
                "longitude": shipment.longitude,
                "current_location": shipment.current_location,
                "status": shipment.status,
                "delivery_progress": shipment.delivery_progress,
                "updated_at": (
                    shipment.updated_at.isoformat()
                    if shipment.updated_at
                    else None
                ),
            }

        except Exception:
            db.rollback()
            raise
        finally:
            db.close()


automatic_shipment_simulator = AutomaticShipmentSimulator()
