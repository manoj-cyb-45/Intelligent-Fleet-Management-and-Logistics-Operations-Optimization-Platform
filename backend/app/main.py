from fastapi import FastAPI

from app.auth.routes import router as auth_router


app = FastAPI(
    title="FleetFlow API",
    version="1.0.0",
)

app.include_router(auth_router)


@app.get("/health")
def health_check():
    return {"status": "healthy"}