from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine

# Import models
import app.models.user
import app.models.driver
import app.models.vehicle

# Import routers
from app.routes.auth import router as auth_router
from app.routes.driver import router as driver_router
from app.routes.vehicle import router as vehicle_router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FleetFlow API",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(driver_router)
app.include_router(vehicle_router)

# Home route
@app.get("/")
def home():
    return {
        "message": "FleetFlow Running 🚚"
    }