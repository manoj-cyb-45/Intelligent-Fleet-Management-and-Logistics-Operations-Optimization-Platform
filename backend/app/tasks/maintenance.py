from app.alerts.service import monitor_maintenance_alerts
from app.celery_app import celery_app
from app.database.database import SessionLocal


@celery_app.task(
    name="maintenance.monitor_maintenance_alerts",
)
def monitor_maintenance_alerts_task():
    """
    Periodically check maintenance records and
    generate required maintenance alerts.
    """

    db = SessionLocal()

    try:
        alerts = monitor_maintenance_alerts(db)

        return {
            "status": "success",
            "alerts_created": len(alerts),
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()