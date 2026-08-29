from pydantic import BaseModel

class VehicleCreate(BaseModel):
    vehicle_number: str
    model: str
    driver: str
    status: str = "Available"


class VehicleResponse(BaseModel):
    id: int
    vehicle_number: str
    model: str
    driver: str
    status: str

    class Config:
        from_attributes = True