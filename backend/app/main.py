from fastapi import FastAPI

from app.auth.routes import router as auth_router
from app.users.routes import router as users_router
from app.vehicles.routes import router as vehicles_router


app = FastAPI(
    title="FleetFlow API",
    version="1.0.0",
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(vehicles_router)


@app.get("/health")
def health_check():
    return {"status": "healthy"}