from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.jwt import decode_access_token


security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Validate the JWT token and return the authenticated user.
    """

    try:
        payload = decode_access_token(
            credentials.credentials
        )

        user_id = payload.get("sub")
        role = payload.get("role")

        if not user_id or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

        return {
            "user_id": user_id,
            "role": role,
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )


def require_roles(*allowed_roles: str):
    """
    Restrict an endpoint to specific roles.
    """

    allowed_roles = {
        role.upper()
        for role in allowed_roles
    }

    def role_checker(
        current_user: dict = Depends(get_current_user),
    ) -> dict:

        current_role = current_user["role"].upper()

        if current_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )

        return current_user

    return role_checker