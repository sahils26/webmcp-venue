"""FastAPI application entrypoint for the venue backend."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import create_db_and_tables
from .routers import bookings, health, quotes, venues

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # In local/dev (SQLite) bootstrap the schema directly; production schema is
    # owned by Alembic migrations.
    if settings.resolved_database_url.startswith("sqlite"):
        create_db_and_tables()
    yield


app = FastAPI(title="spaces360 Venue API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(venues.router)
app.include_router(bookings.router)
app.include_router(quotes.router)


@app.get("/", tags=["health"])
def root() -> dict[str, str]:
    return {"service": "spaces360 Venue API", "docs": "/docs"}
