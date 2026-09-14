from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    DISPATCHER = "DISPATCHER"
    DRIVER = "DRIVER"


class UserCreate(BaseModel):
    user_id: str = Field(min_length=3, max_length=20)
    password: str = Field(min_length=8)
    role: UserRole
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=20)
    license_details: str | None = None
    experience_years: int | None = Field(default=None, ge=0)
    working_hours: str | None = None