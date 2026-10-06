from datetime import datetime

from pydantic import BaseModel


class NotificationCreate(BaseModel):
    user_id: str
    notification_type: str
    title: str
    message: str


class NotificationResponse(BaseModel):
    notification_id: int
    user_id: str
    notification_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime