from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    get_current_user,
    require_roles,
)
from app.auth.jwt import create_access_token
from app.auth.schemas import (
    LoginRequest,
    LoginResponse,
)
from app.auth.security import verify_password
from app.database.database import get_db
from app.models import User


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/login",
    response_model=LoginResponse,
)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):

    user = (
        db.query(User)
        .filter(
            User.user_id == request.user_id
        )
        .first()
    )

    # Do not reveal whether the user ID exists.
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID or password",
        )

    if not verify_password(
        request.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID or password",
        )

    if user.account_status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active",
        )

    access_token = create_access_token(
        user_id=user.user_id,
        role=user.role,
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.user_id,
        role=user.role,
    )


@router.get("/me")
def get_me(
    current_user: dict = Depends(
        get_current_user
    ),
):
    return current_user


@router.get("/driver-test")
def driver_test(
    current_user: dict = Depends(
        require_roles("DRIVER")
    ),
):
    return {
        "message": "Driver access granted",
        "user_id": current_user["user_id"],
        "role": current_user["role"],
    }