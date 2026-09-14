import os
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure environment variables for app import
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-123456789012345678901234567890"

from app.database.database import Base, get_db
from app.main import app
from app.models import (
    MaintenanceRecord,
    Shipment,
    ShipmentHistory,
    User,
    Vehicle,
)
from app.auth.jwt import create_access_token
from app.shipments.scheduling_service import (
    check_driver_availability,
    check_vehicle_availability,
    get_available_resources,
    validate_time_window,
)

# Setup in-memory test DB
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Create test dispatcher
    dispatcher = User(
        user_id="DISPATCHER01",
        password_hash="test",
        role="DISPATCHER",
        name="Test Dispatcher",
        email="disp@fleetflow.test",
        phone="1234567890",
        account_status="ACTIVE",
    )
    db.add(dispatcher)

    # Create test drivers
    driver1 = User(
        user_id="DRV001",
        password_hash="test",
        role="DRIVER",
        name="Ramesh Kumar",
        email="driver1@fleetflow.test",
        phone="9876543210",
        account_status="ACTIVE",
    )
    driver2 = User(
        user_id="DRV002",
        password_hash="test",
        role="DRIVER",
        name="Suresh Raina",
        email="driver2@fleetflow.test",
        phone="9876543211",
        account_status="ACTIVE",
    )
    driver_inactive = User(
        user_id="DRV_INACTIVE",
        password_hash="test",
        role="DRIVER",
        name="Inactive Driver",
        email="inactive@fleetflow.test",
        phone="9876543212",
        account_status="SUSPENDED",
    )
    db.add_all([driver1, driver2, driver_inactive])

    # Create test vehicles
    v1 = Vehicle(
        vehicle_id="VH001",
        registration_number="TN38-AA-1001",
        vehicle_type="Heavy Truck",
        capacity=15000.0,
        fuel_type="Diesel",
        current_status="AVAILABLE",
    )
    v2 = Vehicle(
        vehicle_id="VH002",
        registration_number="TN38-AA-1002",
        vehicle_type="Medium Truck",
        capacity=8000.0,
        fuel_type="Diesel",
        current_status="AVAILABLE",
    )
    v_maint = Vehicle(
        vehicle_id="VH_MAINT",
        registration_number="TN38-AA-9999",
        vehicle_type="Light Van",
        capacity=2000.0,
        fuel_type="Electric",
        current_status="MAINTENANCE",
    )
    db.add_all([v1, v2, v_maint])

    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine)


def get_token(user_id: str, role: str):
    return create_access_token(user_id=user_id, role=role)


def test_time_window_validation():
    now = datetime.utcnow()
    valid, err = validate_time_window(now + timedelta(hours=1), now + timedelta(hours=5), is_new=True)
    assert valid is True
    assert err is None

    # start >= end
    valid, err = validate_time_window(now + timedelta(hours=5), now + timedelta(hours=2), is_new=True)
    assert valid is False
    assert "strictly earlier" in err

    # past start time for new schedule
    valid, err = validate_time_window(now - timedelta(hours=2), now + timedelta(hours=2), is_new=True)
    assert valid is False
    assert "cannot be in the past" in err


def test_vehicle_and_driver_availability_service():
    db = TestingSessionLocal()
    start_time = datetime.utcnow() + timedelta(days=1, hours=9)
    end_time = datetime.utcnow() + timedelta(days=1, hours=17)

    # VH001 is available
    res_v = check_vehicle_availability(db, "VH001", start_time, end_time)
    assert res_v.available is True

    # VH_MAINT is not available due to MAINTENANCE status
    res_vm = check_vehicle_availability(db, "VH_MAINT", start_time, end_time)
    assert res_vm.available is False
    assert "maintenance" in res_vm.reason.lower()

    # DRV001 is available
    res_d = check_driver_availability(db, "DRV001", start_time, end_time)
    assert res_d.available is True

    # DRV_INACTIVE is not available
    res_di = check_driver_availability(db, "DRV_INACTIVE", start_time, end_time)
    assert res_di.available is False
    assert "SUSPENDED" in res_di.reason

    # Add overlapping maintenance record to VH002
    maint = MaintenanceRecord(
        vehicle_id="VH002",
        maintenance_type="Brake Service",
        description="Scheduled brake overhaul",
        maintenance_date=start_time - timedelta(hours=2),
        due_date=end_time + timedelta(hours=2),
        cost=350.0,
        status="SCHEDULED",
    )
    db.add(maint)
    db.commit()

    res_v2 = check_vehicle_availability(db, "VH002", start_time, end_time)
    assert res_v2.available is False
    assert "scheduled maintenance" in res_v2.reason.lower()

    db.close()


def test_check_availability_endpoint():
    client = TestClient(app)
    token = get_token("DISPATCHER01", "DISPATCHER")
    headers = {"Authorization": f"Bearer {token}"}

    start = (datetime.utcnow() + timedelta(days=2)).isoformat()
    end = (datetime.utcnow() + timedelta(days=2, hours=8)).isoformat()

    response = client.post(
        "/shipments/check-availability",
        headers=headers,
        json={
            "vehicle_id": "VH001",
            "driver_id": "DRV001",
            "scheduled_start_time": start,
            "expected_delivery_at": end,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is True
    assert data["vehicle"]["available"] is True
    assert data["driver"]["available"] is True
    assert "VH001" in data["available_vehicles"]
    assert "DRV001" in data["available_drivers"]


def test_schedule_trip_and_conflict_prevention():
    client = TestClient(app)
    token = get_token("DISPATCHER01", "DISPATCHER")
    headers = {"Authorization": f"Bearer {token}"}

    start = (datetime.utcnow() + timedelta(days=3, hours=9)).isoformat()
    end = (datetime.utcnow() + timedelta(days=3, hours=15)).isoformat()

    # 1. Successfully schedule a trip
    resp1 = client.post(
        "/shipments/schedule",
        headers=headers,
        json={
            "origin": "Coimbatore",
            "destination": "Chennai",
            "scheduled_start_time": start,
            "expected_delivery_at": end,
            "vehicle_id": "VH001",
            "driver_id": "DRV001",
            "description": "Electronics consignment",
        },
    )
    assert resp1.status_code == 201
    shipment1 = resp1.json()
    assert shipment1["status"] == "SCHEDULED"
    assert shipment1["scheduled_start_time"] is not None
    assert shipment1["vehicle_id"] == "VH001"
    assert shipment1["driver_id"] == "DRV001"

    # 2. Attempt to schedule overlapping trip with same vehicle (Conflict -> 409)
    overlap_start = (datetime.utcnow() + timedelta(days=3, hours=12)).isoformat()
    overlap_end = (datetime.utcnow() + timedelta(days=3, hours=18)).isoformat()

    resp_v_conflict = client.post(
        "/shipments/schedule",
        headers=headers,
        json={
            "origin": "Salem",
            "destination": "Madurai",
            "scheduled_start_time": overlap_start,
            "expected_delivery_at": overlap_end,
            "vehicle_id": "VH001",
            "driver_id": "DRV002",
            "description": "Overlapping vehicle trip",
        },
    )
    assert resp_v_conflict.status_code == 409
    assert "Vehicle conflict" in resp_v_conflict.json()["detail"]

    # 3. Attempt to schedule overlapping trip with same driver (Conflict -> 409)
    resp_d_conflict = client.post(
        "/shipments/schedule",
        headers=headers,
        json={
            "origin": "Trichy",
            "destination": "Bangalore",
            "scheduled_start_time": overlap_start,
            "expected_delivery_at": overlap_end,
            "vehicle_id": "VH002",
            "driver_id": "DRV001",
            "description": "Overlapping driver trip",
        },
    )
    assert resp_d_conflict.status_code == 409
    assert "Driver conflict" in resp_d_conflict.json()["detail"]


def test_start_trip_workflow():
    client = TestClient(app)
    dispatcher_token = get_token("DISPATCHER01", "DISPATCHER")
    driver_token = get_token("DRV001", "DRIVER")
    other_driver_token = get_token("DRV002", "DRIVER")

    # Schedule trip
    start = (datetime.utcnow() + timedelta(days=4, hours=8)).isoformat()
    end = (datetime.utcnow() + timedelta(days=4, hours=16)).isoformat()

    resp = client.post(
        "/shipments/schedule",
        headers={"Authorization": f"Bearer {dispatcher_token}"},
        json={
            "origin": "Coimbatore Hub",
            "destination": "Chennai Central",
            "scheduled_start_time": start,
            "expected_delivery_at": end,
            "vehicle_id": "VH001",
            "driver_id": "DRV001",
            "description": "High priority delivery",
        },
    )
    assert resp.status_code == 201
    shipment_id = resp.json()["shipment_id"]

    # Other driver cannot start this trip (403)
    resp_forbidden = client.post(
        f"/shipments/{shipment_id}/start-trip",
        headers={"Authorization": f"Bearer {other_driver_token}"},
    )
    assert resp_forbidden.status_code == 403

    # Assigned driver starts trip
    resp_start = client.post(
        f"/shipments/{shipment_id}/start-trip",
        headers={"Authorization": f"Bearer {driver_token}"},
        json={
            "current_location": "Coimbatore Gate 1",
            "notes": "Vehicle inspected and departed on time",
        },
    )
    assert resp_start.status_code == 200
    started_shipment = resp_start.json()
    assert started_shipment["status"] == "IN_TRANSIT"
    assert started_shipment["started_at"] is not None
    assert started_shipment["delivery_progress"] >= 10.0


def test_get_schedules_endpoint():
    client = TestClient(app)
    token = get_token("DISPATCHER01", "DISPATCHER")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/shipments/schedules", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
