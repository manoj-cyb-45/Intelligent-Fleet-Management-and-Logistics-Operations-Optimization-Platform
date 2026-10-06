import os

from celery import Celery
from dotenv import load_dotenv


load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")


CELERY_BROKER_URL = os.getenv(
    "CELERY_BROKER_URL",
    f"sqla+{DATABASE_URL}",
)

CELERY_RESULT_BACKEND = os.getenv(
    "CELERY_RESULT_BACKEND",
    f"db+{DATABASE_URL}",
)


celery_app = Celery(
    "fleetflow",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
)


celery_app.conf.update(
    timezone="Asia/Kolkata",
    enable_utc=False,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    beat_schedule={
        "monitor-maintenance-alerts": {
            "task": "maintenance.monitor_maintenance_alerts",
            "schedule": 3600.0,
        },
    },
)


# Explicitly import the task module so the task is registered.
import app.tasks.maintenance  # noqa: E402,F401