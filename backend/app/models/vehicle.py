from sqlalchemy import Column, Integer, String
from app.core.database import Base

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(50), unique=True, nullable=False)
    model = Column(String(100), nullable=False)
    driver = Column(String(100), nullable=False)
    status = Column(String(30), default="Available")