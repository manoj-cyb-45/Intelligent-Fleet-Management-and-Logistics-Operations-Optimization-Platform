from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models import Alert, MaintenanceRecord


def monitor_maintenance_alerts(
    db: Session,
) -> list[Alert]:
    """
    Check active maintenance records and create alerts for:
    - Overdue maintenance
    - Maintenance due within the next 7 days

    Existing open alerts of the same type are not duplicated.
    """

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

    generated_alerts: list[Alert] = []

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

        elif (
            due_date is not None
            and today
            <= due_date
            <= today + timedelta(days=7)
        ):

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

    return generated_alerts