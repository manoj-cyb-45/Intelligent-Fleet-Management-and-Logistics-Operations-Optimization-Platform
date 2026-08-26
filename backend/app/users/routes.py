from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.auth.security import hash_password
from app.database.database import get_db
from app.models import User
from app.users.schemas import UserCreate


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("ADMIN")),
):
    existing_user = (
        db.query(User)
        .filter(User.user_id == user_data.user_id)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User ID already exists",
        )

    user = User(
        user_id=user_data.user_id,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        name=user_data.name,
        email=user_data.email,
        phone=user_data.phone,
        account_status="ACTIVE",
        license_details=user_data.license_details,
        experience_years=user_data.experience_years,
        working_hours=user_data.working_hours,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "User created successfully",
        "user_id": user.user_id,
        "role": user.role,
    }