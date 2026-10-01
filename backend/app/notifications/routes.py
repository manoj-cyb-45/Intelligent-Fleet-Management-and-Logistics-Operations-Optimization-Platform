from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.database import get_db
from app.models import Notification, User

from app.notifications.schemas import (
    NotificationCreate,
    NotificationResponse,
)

from app.notifications.service import (
    send_email_notification,
    send_sms_notification,
    send_push_notification,
)


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# ============================================================
# RESPONSE BUILDER
# ============================================================

def build_notification_response(
    notification: Notification,
) -> NotificationResponse:

    return NotificationResponse(
        notification_id=notification.notification_id,
        user_id=notification.user_id,
        notification_type=notification.notification_type,
        title=notification.title,
        message=notification.message,
        is_read=notification.is_read,
        created_at=notification.created_at,
    )


# ============================================================
# GET ALL NOTIFICATIONS FOR CURRENT USER
# ============================================================

@router.get(
    "",
    response_model=list[NotificationResponse],
)
def list_notifications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
            "DRIVER",
        )
    ),
):

    user_id = current_user.get("user_id")

    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    return [
        build_notification_response(notification)
        for notification in notifications
    ]


# ============================================================
# CREATE NOTIFICATION
# ============================================================

@router.post(
    "",
    response_model=NotificationResponse,
)
def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):

    # --------------------------------------------------------
    # Check whether target user exists
    # --------------------------------------------------------

    user = (
        db.query(User)
        .filter(User.user_id == payload.user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # --------------------------------------------------------
    # Create in-app notification
    # --------------------------------------------------------

    notification = Notification(
        user_id=payload.user_id,
        notification_type=payload.notification_type,
        title=payload.title,
        message=payload.message,
        is_read=False,
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    # --------------------------------------------------------
    # EMAIL NOTIFICATION
    # --------------------------------------------------------

    send_email_notification(
        recipient_email=user.email,
        title=notification.title,
        message=notification.message,
    )

    # --------------------------------------------------------
    # SMS NOTIFICATION
    # --------------------------------------------------------

    send_sms_notification(
        phone_number=user.phone,
        message=notification.message,
    )

    # --------------------------------------------------------
    # PUSH NOTIFICATION
    # --------------------------------------------------------

    send_push_notification(
        user_id=user.user_id,
        title=notification.title,
        message=notification.message,
    )

    # --------------------------------------------------------
    # Return created notification
    # --------------------------------------------------------

    return build_notification_response(notification)


# ============================================================
# MARK NOTIFICATION AS READ
# ============================================================

@router.put(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
            "DRIVER",
        )
    ),
):

    notification = (
        db.query(Notification)
        .filter(
            Notification.notification_id == notification_id
        )
        .first()
    )

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found",
        )

    # --------------------------------------------------------
    # Users can only modify their own notifications
    # --------------------------------------------------------

    if notification.user_id != current_user.get("user_id"):
        raise HTTPException(
            status_code=403,
            detail="You can only update your own notifications",
        )

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return build_notification_response(notification)