from app.auth.security import hash_password
from app.database.database import SessionLocal
from app.models import User


db = SessionLocal()

try:
    test_users = [
        {
            "user_id": "ADM001",
            "password": "Admin@123",
            "role": "ADMIN",
            "name": "Test Admin",
            "email": "admin@test.com",
            "phone": "9999999999",
        },
        {
            "user_id": "MGR001",
            "password": "Manager@123",
            "role": "MANAGER",
            "name": "Test Manager",
            "email": "manager@test.com",
            "phone": "9999999998",
        },
        {
            "user_id": "DSP001",
            "password": "Dispatcher@123",
            "role": "DISPATCHER",
            "name": "Test Dispatcher",
            "email": "dispatcher@test.com",
            "phone": "9999999997",
        },
        {
            "user_id": "DRV001",
            "password": "Driver@123",
            "role": "DRIVER",
            "name": "Test Driver",
            "email": "driver@test.com",
            "phone": "9999999996",
        },
    ]

    for data in test_users:

        existing_user = (
            db.query(User)
            .filter(
                User.user_id == data["user_id"]
            )
            .first()
        )

        if existing_user:
            print(
                f"{data['user_id']} already exists. Skipping."
            )
            continue

        existing_email = (
            db.query(User)
            .filter(
                User.email == data["email"]
            )
            .first()
        )

        if existing_email:
            print(
                f"{data['email']} already exists. Skipping."
            )
            continue

        user = User(
            user_id=data["user_id"],
            password_hash=hash_password(
                data["password"]
            ),
            role=data["role"],
            name=data["name"],
            email=data["email"],
            phone=data["phone"],
            account_status="ACTIVE",
            license_details=(
                "Test Driver License"
                if data["role"] == "DRIVER"
                else None
            ),
            experience_years=(
                5
                if data["role"] == "DRIVER"
                else None
            ),
            working_hours="09:00-18:00",
        )

        db.add(user)

        print(
            f"{data['user_id']} created successfully."
        )

    db.commit()

    print("\n===================================")
    print("TEST USERS")
    print("===================================")
    print("ADMIN      : ADM001 / Admin@123")
    print("MANAGER    : MGR001 / Manager@123")
    print("DISPATCHER : DSP001 / Dispatcher@123")
    print("DRIVER     : DRV001 / Driver@123")
    print("===================================")

finally:
    db.close()