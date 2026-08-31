from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.database import get_db
from app.models import Alert
from app.alerts.schemas import AlertResponse


router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"],
)


# =========================================================
# HELPER
# =========================================================

def build_alert_response(alert: Alert):
    return AlertResponse(
        alert_id=alert.alert_id,
        shipment_id=alert.shipment_id,
        alert_type=alert.alert_type,
        message=alert.message,
        severity=alert.severity,
        status=alert.status,
        created_at=alert.created_at,
        resolved_at=alert.resolved_at,
    )


# =========================================================
# LIST ALERTS
# =========================================================

@router.get(
    "",
    response_model=list[AlertResponse],
)
def list_alerts(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):

    # -----------------------------------------------------
    # ADMIN / MANAGER
    # Can see all alerts
    # -----------------------------------------------------

    if current_user.get("role") in {
        "ADMIN",
        "MANAGER",
    }:

        alerts = (
            db.query(Alert)
            .order_by(
                Alert.created_at.desc()
            )
            .all()
        )

    # -----------------------------------------------------
    # DISPATCHER
    # Can see only shipment-related alerts
    # -----------------------------------------------------

    else:

        alerts = (
            db.query(Alert)
            .filter(
                Alert.shipment_id.isnot(None)
            )
            .order_by(
                Alert.created_at.desc()
            )
            .all()
        )

    return [
        build_alert_response(alert)
        for alert in alerts
    ]


# =========================================================
# GET SINGLE ALERT
# =========================================================

@router.get(
    "/{alert_id}",
    response_model=AlertResponse,
)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):

    alert = (
        db.query(Alert)
        .filter(
            Alert.alert_id == alert_id
        )
        .first()
    )

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    # -----------------------------------------------------
    # DISPATCHER CANNOT ACCESS NON-SHIPMENT ALERTS
    # -----------------------------------------------------

    if (
        current_user.get("role") == "DISPATCHER"
        and alert.shipment_id is None
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Dispatcher can access only "
                "shipment-related alerts"
            ),
        )

    return build_alert_response(alert)


# =========================================================
# RESOLVE ALERT
# =========================================================

@router.put(
    "/{alert_id}/resolve",
    response_model=AlertResponse,
)
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):

    alert = (
        db.query(Alert)
        .filter(
            Alert.alert_id == alert_id
        )
        .first()
    )

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    # -----------------------------------------------------
    # DISPATCHER CANNOT RESOLVE NON-SHIPMENT ALERTS
    # -----------------------------------------------------

    if (
        current_user.get("role") == "DISPATCHER"
        and alert.shipment_id is None
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Dispatcher can resolve only "
                "shipment-related alerts"
            ),
        )

    # -----------------------------------------------------
    # ALREADY RESOLVED
    # -----------------------------------------------------

    if alert.status == "RESOLVED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alert is already resolved",
        )

    alert.status = "RESOLVED"
    alert.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(alert)

    return build_alert_response(alert)