# Venue Backend

FastAPI + SQLModel + Alembic backend for the spaces360 venue website. It makes
the venue catalog, availability, bookings, and quote requests real and
persistent (replacing the static JSON and browser-only localStorage).

- **Stack:** FastAPI, SQLModel (SQLAlchemy), Alembic, Pydantic v2.
- **Database:** Neon Postgres in production; falls back to a local SQLite file
  (`venue.db`) when `DATABASE_URL` is unset, so local dev needs no services.
- **Deploy:** Render free web service (see `../render.yaml`).

## Layout

```
backend/
  app/
    config.py            # settings (DATABASE_URL, CORS_ORIGINS, ...)
    database.py          # engine + session dependency
    main.py              # FastAPI app, CORS, router wiring
    models/              # SQLModel tables (one module per area)
    schemas/             # Pydantic request/response models
    routers/             # health, venues, bookings, quotes
    services/catalog.py  # rebuilds the frontend-compatible catalog from the DB
    seed.py              # seeds the catalog from venue-website's static JSON
  migrations/            # Alembic environment + versions
```

## Local development

From the repository root, the recommended setup is:

```bash
./scripts/setup-backend.sh
./scripts/start-backend.sh
```

The API runs at `http://127.0.0.1:8000`, with interactive documentation at
`http://127.0.0.1:8000/docs`. Local data is stored in `backend/venue.db`. The
database is intentionally ignored by Git, but it persists across local restarts.

To run the backend test suite against an isolated temporary database:

```bash
./scripts/test-backend.sh
```

The equivalent manual setup is:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

# Create the schema (Alembic is authoritative) ...
alembic upgrade head
# ... and load catalog data from venue-website/src/data/venueSearchResults.json
python -m app.seed

# Run the API (http://127.0.0.1:8000, docs at /docs)
uvicorn app.main:app --reload
```

With SQLite, starting the app also creates missing tables automatically. Seeding
is repeatable and refreshes catalog data without deleting bookings or quotes.

## Configuration

Copy `.env.example` to `.env`. Key variables:

- `DATABASE_URL` — Postgres URL; empty = local SQLite.
- `CORS_ORIGINS` — comma-separated allowed origins (the venue-website dev server
  defaults are preconfigured).
- `ENVIRONMENT` — `development` | `production`.
- `ADMIN_API_KEY` — sent as `X-Admin-API-Key` when reading customer quote data.

## API

| Method | Path                                   | Purpose                                            |
| ------ | -------------------------------------- | -------------------------------------------------- |
| GET    | `/health`                              | Liveness + DB reachability probe.                  |
| GET    | `/api/venues`                          | Full localized catalog (same shape as static JSON).|
| GET    | `/api/venues/{venue_id}`               | Single venue.                                      |
| GET    | `/api/venues/{venue_id}/availability`  | `?date=YYYY-MM-DD` availability check.             |
| POST   | `/api/bookings`                        | Create a confirmed booking (409 on double-booking).|
| POST   | `/api/quotes`                          | Persist a quote request and hold its date.         |
| GET    | `/api/quotes`                          | List quotes with `X-Admin-API-Key`.                |

All future dates are available unless blocked by a confirmed booking or an active
quote hold. Confirmed bookings and active quotes each use partial unique indexes
to prevent duplicate dates. The catalog returns `blocked_dates`, live
`next_available_date`, and venue `event_types`. Booking and quote requests reject
unknown venues, past/blocked dates, non-positive guest counts, and counts above
venue capacity.

## Migrations

```bash
# After changing a model:
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## Frontend integration

`GET /api/venues` is the frontend source of truth. The bundled JSON remains a
startup fallback, while the API adds live `blocked_dates` and preserves the
existing localized catalog and event-type fields.

Recommended frontend mapping:

| Frontend action | Backend call |
| --- | --- |
| Load cards, details, search source | `GET /api/venues` |
| Check a selected date | `GET /api/venues/{venue_id}/availability?date=...` |
| Submit the quote form | `POST /api/quotes` |
| Confirm a booking, if enabled in the UI | `POST /api/bookings` |

WebMCP tools should use these same read endpoints. Keep form preparation as a
UI-only tool; do not submit quote or booking writes from a tool that the visible
frontend replays after the agent's hidden browser has already executed it.
