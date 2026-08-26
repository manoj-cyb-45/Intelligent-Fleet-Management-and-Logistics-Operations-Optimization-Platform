from app.auth.security import hash_password
from app.database.database import SessionLocal
from app.models import User


db = SessionLocal()

try:
    user = User(
        user_id="ADM001",
        password_hash=hash_password("Admin@123"),
        role="ADMIN",
        name="Test Admin",
        email="admin@test.com",
        phone="9999999999",
        account_status="ACTIVE",
        license_details=None,
        experience_years=None,
        working_hours="09:00-18:00",
    )

    db.add(user)
    db.commit()

    print("Admin test user created successfully!")

finally:
    db.close()