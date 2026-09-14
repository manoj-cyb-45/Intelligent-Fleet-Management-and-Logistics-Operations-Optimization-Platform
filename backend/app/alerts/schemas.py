from datetime import datetime

from pydantic import BaseModel


class AlertResponse(BaseModel):
    alert_id: int
    shipment_id: str | None
    alert_type: str
    message: str
    severity: str
    status: str
    created_at: datetime
    resolved_at: datetime | None