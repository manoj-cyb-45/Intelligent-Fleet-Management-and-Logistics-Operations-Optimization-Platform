import os
from datetime import datetime, timedelta

from app.auth.security import hash_password
from app.database.database import Base, SessionLocal, engine
from app.models import (
    DriverVehicleAssignment,
    MaintenanceRecord,
    Shipment,
    ShipmentHistory,
    User,
    Vehicle,
)

Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    # 1. Users
    users_data = [
        {
            "user_id": "ADM001",
            "password": "Admin@123",
            "role": "ADMIN",
            "name": "Alex Mercer",
            "email": "admin@fleetflow.io",
            "phone": "9876543210",
        },
        {
            "user_id": "DSP001",
            "password": "Dispatcher@123",
            "role": "DISPATCHER",
            "name": "Sarah Connor",
            "email": "dispatcher@fleetflow.io",
            "phone": "9876543211",
        },
        {
            "user_id": "DRV001",
            "password": "Driver@123",
            "role": "DRIVER",
            "name": "Ramesh Kumar",
            "email": "ramesh@fleetflow.io",
            "phone": "9876543212",
            "license_details": "DL-TN-2022-0091",
            "experience_years": 6,
            "working_hours": "08:00-18:00",
        },
        {
            "user_id": "DRV002",
            "password": "Driver@123",
            "role": "DRIVER",
            "name": "Suresh Raina",
            "email": "suresh@fleetflow.io",
            "phone": "9876543213",
            "license_details": "DL-TN-2021-4412",
            "experience_years": 4,
            "working_hours": "08:00-18:00",
        },
    ]

    for u in users_data:
        if not db.query(User).filter(User.user_id == u["user_id"]).first():
            user = User(
                user_id=u["user_id"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
                name=u["name"],
                email=u["email"],
                phone=u["phone"],
                account_status="ACTIVE",
                license_details=u.get("license_details"),
                experience_years=u.get("experience_years"),
                working_hours=u.get("working_hours", "08:00-18:00"),
            )
            db.add(user)

    # 2. Vehicles
    vehicles_data = [
        {
            "vehicle_id": "VH001",
            "registration_number": "TN-38-AB-1001",
            "vehicle_type": "Heavy Cargo Truck",
            "capacity": 16000.0,
            "fuel_type": "Diesel",
            "current_status": "AVAILABLE",
            "current_location": "Coimbatore Hub",
            "fuel_level": 85.0,
            "mileage": 42000.0,
        },
        {
            "vehicle_id": "VH002",
            "registration_number": "TN-38-CD-2002",
            "vehicle_type": "Medium Delivery Truck",
            "capacity": 8500.0,
            "fuel_type": "Diesel",
            "current_status": "AVAILABLE",
            "current_location": "Salem Logistics Yard",
            "fuel_level": 92.0,
            "mileage": 28500.0,
        },
        {
            "vehicle_id": "VH003",
            "registration_number": "TN-38-EF-3003",
            "vehicle_type": "Electric Express Van",
            "capacity": 2500.0,
            "fuel_type": "Electric",
            "current_status": "AVAILABLE",
            "current_location": "Chennai Central Depot",
            "fuel_level": 100.0,
            "mileage": 12400.0,
        },
    ]

    for v in vehicles_data:
        if not db.query(Vehicle).filter(Vehicle.vehicle_id == v["vehicle_id"]).first():
            veh = Vehicle(**v)
            db.add(veh)

    # 3. Sample Scheduled Shipment
    now = datetime.utcnow()
    sched_start = now + timedelta(hours=3)
    exp_delivery = sched_start + timedelta(hours=6)

    if not db.query(Shipment).filter(Shipment.shipment_id == "SH001").first():
        s1 = Shipment(
            shipment_id="SH001",
            tracking_number="TRK001",
            description="Automotive components & spares",
            origin="Coimbatore Hub",
            destination="Chennai Terminal 2",
            due_date=exp_delivery,
            status="SCHEDULED",
            current_location="Coimbatore Hub",
            delivery_progress=0.0,
            scheduled_start_time=sched_start,
            expected_delivery_at=exp_delivery,
            started_at=None,
            delivered_at=None,
            vehicle_id="VH001",
            driver_id="DRV001",
            created_at=now,
            updated_at=now,
        )
        db.add(s1)

        h1 = ShipmentHistory(
            shipment_id="SH001",
            status="SCHEDULED",
            location="Coimbatore Hub",
            event_time=now,
            description=f"Trip scheduled for departure at {sched_start.strftime('%Y-%m-%d %H:%M')}",
        )
        db.add(h1)

    db.commit()
    print("Seeding completed successfully!")
finally:
    db.close()
