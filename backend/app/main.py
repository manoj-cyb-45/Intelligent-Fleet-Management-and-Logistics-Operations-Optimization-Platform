from fastapi import FastAPI

from app.auth.routes import router as auth_router
from app.users.routes import router as users_router
from app.vehicles.routes import router as vehicles_router
from app.drivers.routes import router as drivers_router
from app.shipments.routes import router as shipments_router
from app.alerts.routes import router as alerts_router

app = FastAPI(
    title="FleetFlow API",
    version="1.0.0",
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(vehicles_router)
app.include_router(drivers_router)
app.include_router(shipments_router)
app.include_router(alerts_router)

@app.get("/health")
def health_check():
    return {"status": "healthy"}