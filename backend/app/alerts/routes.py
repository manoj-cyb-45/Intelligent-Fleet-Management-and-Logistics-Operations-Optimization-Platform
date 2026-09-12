from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.database import get_db
from app.models import Alert, Shipment
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


# =========================================================
# MONITOR SHIPMENTS
# =========================================================

@router.post(
    "/monitor-shipments",
)
def monitor_shipments(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
            "DISPATCHER",
        )
    ),
):

    now = datetime.utcnow()

    # -----------------------------------------------------
    # GET ACTIVE SHIPMENTS
    # Ignore delivered and cancelled shipments
    # -----------------------------------------------------

    shipments = (
        db.query(Shipment)
        .filter(
            Shipment.status.notin_(
                ["DELIVERED", "CANCELLED"]
            )
        )
        .all()
    )

    generated_alerts = []

    for shipment in shipments:

        # =================================================
        # OVERDUE CHECK
        # =================================================

        if shipment.due_date < now:

            existing_alert = (
                db.query(Alert)
                .filter(
                    Alert.shipment_id == shipment.shipment_id,
                    Alert.alert_type == "SHIPMENT_OVERDUE",
                    Alert.status == "OPEN",
                )
                .first()
            )

            if not existing_alert:

                alert = Alert(
                    shipment_id=shipment.shipment_id,
                    alert_type="SHIPMENT_OVERDUE",
                    message=(
                        f"Shipment {shipment.shipment_id} "
                        f"is overdue."
                    ),
                    severity="HIGH",
                    status="OPEN",
                    created_at=now,
                )

                db.add(alert)
                generated_alerts.append(alert)

        # =================================================
        # DELAYED CHECK
        # =================================================

        if shipment.status == "DELAYED":

            existing_alert = (
                db.query(Alert)
                .filter(
                    Alert.shipment_id == shipment.shipment_id,
                    Alert.alert_type == "SHIPMENT_DELAYED",
                    Alert.status == "OPEN",
                )
                .first()
            )

            if not existing_alert:

                alert = Alert(
                    shipment_id=shipment.shipment_id,
                    alert_type="SHIPMENT_DELAYED",
                    message=(
                        f"Shipment {shipment.shipment_id} "
                        f"is delayed."
                    ),
                    severity="MEDIUM",
                    status="OPEN",
                    created_at=now,
                )

                db.add(alert)
                generated_alerts.append(alert)

        # =================================================
        # ETA CHECK
        # =================================================

        if (
            shipment.expected_delivery_at is not None
            and shipment.expected_delivery_at < now
        ):

            existing_alert = (
                db.query(Alert)
                .filter(
                    Alert.shipment_id == shipment.shipment_id,
                    Alert.alert_type == "SHIPMENT_ETA_MISSED",
                    Alert.status == "OPEN",
                )
                .first()
            )

            if not existing_alert:

                alert = Alert(
                    shipment_id=shipment.shipment_id,
                    alert_type="SHIPMENT_ETA_MISSED",
                    message=(
                        f"Shipment {shipment.shipment_id} "
                        f"has missed its expected delivery time."
                    ),
                    severity="HIGH",
                    status="OPEN",
                    created_at=now,
                )

                db.add(alert)
                generated_alerts.append(alert)

    # -----------------------------------------------------
    # SAVE GENERATED ALERTS
    # -----------------------------------------------------

    db.commit()

    for alert in generated_alerts:
        db.refresh(alert)

    return {
        "message": "Shipment monitoring completed",
        "alerts_generated": [
            build_alert_response(alert)
            for alert in generated_alerts
        ],
    }