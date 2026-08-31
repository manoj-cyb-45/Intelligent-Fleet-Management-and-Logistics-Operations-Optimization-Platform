from pydantic import BaseModel, EmailStr, Field


class DriverCreate(BaseModel):
    user_id: str = Field(min_length=3, max_length=20)

    password: str = Field(min_length=8)

    name: str = Field(
        min_length=1,
        max_length=100,
    )

    email: EmailStr

    phone: str = Field(
        min_length=10,
        max_length=20,
    )

    license_details: str | None = None

    experience_years: int | None = Field(
        default=None,
        ge=0,
    )

    working_hours: str | None = None


class DriverUpdate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100,
    )

    email: EmailStr

    phone: str = Field(
        min_length=10,
        max_length=20,
    )

    license_details: str | None = None

    experience_years: int | None = Field(
        default=None,
        ge=0,
    )

    working_hours: str | None = None

    account_status: str = Field(
        default="ACTIVE",
    )

    password: str | None = Field(
        default=None,
        min_length=8,
    )


class DriverResponse(BaseModel):
    driver_id: str

    name: str

    email: str

    phone: str

    license_details: str | None

    experience_years: int | None

    working_hours: str | None

    account_status: str

    assigned_vehicle_id: str | None = None


class AssignmentCreate(BaseModel):
    vehicle_id: str = Field(
        min_length=3,
        max_length=20,
    )


class AssignmentResponse(BaseModel):
    assignment_id: int

    driver_id: str

    vehicle_id: str

    status: str