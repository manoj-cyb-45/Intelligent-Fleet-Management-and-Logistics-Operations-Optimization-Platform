from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.routes import router as auth_router
from app.users.routes import router as users_router
from app.vehicles.routes import router as vehicles_router
from app.drivers.routes import router as drivers_router
from app.shipments.routes import router as shipments_router
from app.alerts.routes import router as alerts_router
from app.maintenance.routes import router as maintenance_router
from app.fuel.routes import router as fuel_router
from app.tracking.routes import router as tracking_router
from app.route_optimizer.routes import router as route_optimizer_router


app = FastAPI(
    title="FleetFlow API",
    version="1.0.0",
)


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


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(vehicles_router)
app.include_router(drivers_router)
app.include_router(shipments_router)
app.include_router(alerts_router)
app.include_router(maintenance_router)
app.include_router(fuel_router)
app.include_router(tracking_router)
app.include_router(route_optimizer_router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }