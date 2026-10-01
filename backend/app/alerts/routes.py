from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.database.database import get_db
from app.models import Alert, MaintenanceRecord
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
        maintenance_id=alert.maintenance_id,
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
# MONITOR MAINTENANCE
# =========================================================

@router.post(
    "/monitor-maintenance",
    response_model=list[AlertResponse],
)
def monitor_maintenance(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles(
            "ADMIN",
            "MANAGER",
        )
    ),
):

    today = datetime.utcnow().date()

    records = (
        db.query(MaintenanceRecord)
        .filter(
            MaintenanceRecord.status.notin_(
                ["COMPLETED", "CANCELLED"]
            )
        )
        .all()
    )

    generated_alerts = []

    for record in records:

        maintenance_date = record.maintenance_date
        due_date = record.due_date

        if maintenance_date is None:
            continue

        if isinstance(maintenance_date, datetime):
            maintenance_date = maintenance_date.date()

        if isinstance(due_date, datetime):
            due_date = due_date.date()
            
        # -------------------------------------------------
        # OVERDUE MAINTENANCE
        # -------------------------------------------------

        if due_date is not None and due_date < today:

            alert_type = "MAINTENANCE_OVERDUE"

            existing_alert = (
                db.query(Alert)
                .filter(
                    Alert.maintenance_id
                    == record.maintenance_id,
                    Alert.alert_type == alert_type,
                    Alert.status == "OPEN",
                )
                .first()
            )

            if not existing_alert:

                alert = Alert(
                    shipment_id=None,
                    maintenance_id=record.maintenance_id,
                    alert_type=alert_type,
                    message=(
                        f"Maintenance for vehicle "
                        f"{record.vehicle_id} is overdue."
                    ),
                    severity="HIGH",
                    status="OPEN",
                )

                db.add(alert)
                generated_alerts.append(alert)

        # -------------------------------------------------
        # MAINTENANCE DUE SOON
        # -------------------------------------------------

        elif today <= maintenance_date <= today + timedelta(days=7):

            alert_type = "MAINTENANCE_DUE"

            existing_alert = (
                db.query(Alert)
                .filter(
                    Alert.maintenance_id
                    == record.maintenance_id,
                    Alert.alert_type == alert_type,
                    Alert.status == "OPEN",
                )
                .first()
            )

            if not existing_alert:

                alert = Alert(
                    shipment_id=None,
                    maintenance_id=record.maintenance_id,
                    alert_type=alert_type,
                    message=(
                        f"Maintenance for vehicle "
                        f"{record.vehicle_id} is due soon."
                    ),
                    severity="MEDIUM",
                    status="OPEN",
                )

                db.add(alert)
                generated_alerts.append(alert)

    db.commit()

    for alert in generated_alerts:
        db.refresh(alert)

    return [
        build_alert_response(alert)
        for alert in generated_alerts
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