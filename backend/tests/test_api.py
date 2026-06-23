"""Backend API contract tests for local demo and frontend integration."""
from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session, func, select

from app.database import engine
from app.models.booking import Booking
from app.models.quote import QuoteRequest
from app.seed import seed

FUTURE_DATE = (date.today() + timedelta(days=30)).isoformat()
SECOND_FUTURE_DATE = (date.today() + timedelta(days=31)).isoformat()
PAST_DATE = (date.today() - timedelta(days=1)).isoformat()

BOOKING_PAYLOAD = {
    "venue_id": "grand-hall",
    "date": FUTURE_DATE,
    "contact_name": "Demo User",
    "contact_email": "demo@example.com",
    "event_type": "conference",
    "guest_count": 100,
}


def test_health_and_catalog_contract(client: TestClient) -> None:
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok", "database": "ok"}

    response = client.get("/api/venues")
    assert response.status_code == 200
    catalog = response.json()
    assert catalog["default_locale"] == "en"
    assert catalog["supported_locales"] == ["en", "de"]
    assert len(catalog["venues"]) == 5
    assert {venue["id"] for venue in catalog["venues"]} >= {
        "grand-hall",
        "garden-pavilion",
    }
    grand_hall = next(venue for venue in catalog["venues"] if venue["id"] == "grand-hall")
    assert "conference" in grand_hall["event_types"]
    assert grand_hall["blocked_dates"] == []


def test_https_localhost_is_allowed_by_cors(client: TestClient) -> None:
    response = client.options(
        "/api/venues",
        headers={
            "Origin": "https://127.0.0.1:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://127.0.0.1:5173"


def test_booking_updates_availability_and_prevents_duplicate(client: TestClient) -> None:
    before = client.get(
        "/api/venues/grand-hall/availability",
        params={"date": BOOKING_PAYLOAD["date"]},
    )
    assert before.status_code == 200
    assert before.json()["available"] is True

    created = client.post("/api/bookings", json=BOOKING_PAYLOAD)
    assert created.status_code == 201
    assert created.json()["status"] == "confirmed"

    duplicate = client.post("/api/bookings", json=BOOKING_PAYLOAD)
    assert duplicate.status_code == 409

    after = client.get(
        "/api/venues/grand-hall/availability",
        params={"date": BOOKING_PAYLOAD["date"]},
    )
    assert after.json()["available"] is False

    venue = client.get("/api/venues/grand-hall").json()
    assert BOOKING_PAYLOAD["date"] in venue["blocked_dates"]


def test_booking_validates_capacity_and_input(client: TestClient) -> None:
    over_capacity = client.post(
        "/api/bookings",
        json={**BOOKING_PAYLOAD, "guest_count": 151},
    )
    assert over_capacity.status_code == 422
    assert "capacity of 150" in over_capacity.json()["detail"]

    invalid = client.post(
        "/api/bookings",
        json={**BOOKING_PAYLOAD, "contact_name": "", "guest_count": 0},
    )
    assert invalid.status_code == 422

    past = client.post(
        "/api/bookings",
        json={**BOOKING_PAYLOAD, "date": PAST_DATE},
    )
    assert past.status_code == 422


def test_quote_requires_known_available_venue(client: TestClient) -> None:
    unknown = client.post(
        "/api/quotes",
        json={
            "room_name": "Unknown Venue",
            "date": FUTURE_DATE,
            "email": "demo@example.com",
        },
    )
    assert unknown.status_code == 404

    assert client.post("/api/bookings", json=BOOKING_PAYLOAD).status_code == 201
    unavailable = client.post(
        "/api/quotes",
        json={
            "room_name": "The Grand Hall",
            "date": FUTURE_DATE,
            "email": "demo@example.com",
        },
    )
    assert unavailable.status_code == 409

    over_capacity = client.post(
        "/api/quotes",
        json={
            "room_name": "The Grand Hall",
            "date": SECOND_FUTURE_DATE,
            "email": "demo@example.com",
            "guest_count": 151,
        },
    )
    assert over_capacity.status_code == 422

    past = client.post(
        "/api/quotes",
        json={
            "room_name": "The Grand Hall",
            "date": PAST_DATE,
            "email": "demo@example.com",
        },
    )
    assert past.status_code == 422


def test_quote_persists_and_listing_requires_admin_key(client: TestClient) -> None:
    quote = client.post(
        "/api/quotes",
        json={
            "room_name": "The Grand Hall",
            "date": FUTURE_DATE,
            "email": "quote@example.com",
            "guest_count": 100,
        },
    )
    assert quote.status_code == 201
    assert quote.json()["venue_id"] == "grand-hall"

    availability = client.get(
        "/api/venues/grand-hall/availability",
        params={"date": FUTURE_DATE},
    )
    assert availability.json()["available"] is False

    duplicate = client.post(
        "/api/quotes",
        json={
            "room_name": "The Grand Hall",
            "date": FUTURE_DATE,
            "email": "another@example.com",
        },
    )
    assert duplicate.status_code == 409

    assert client.get("/api/quotes").status_code == 401
    listed = client.get(
        "/api/quotes",
        headers={"X-Admin-API-Key": "test-admin-key"},
    )
    assert listed.status_code == 200
    assert listed.json()[0]["email"] == "quote@example.com"


def test_reseeding_preserves_transactions(client: TestClient) -> None:
    quote_payload = {
        "room_name": "The Grand Hall",
        "date": SECOND_FUTURE_DATE,
        "email": "quote@example.com",
    }
    assert client.post("/api/quotes", json=quote_payload).status_code == 201
    assert client.post("/api/bookings", json=BOOKING_PAYLOAD).status_code == 201

    assert seed() == 5

    with Session(engine) as session:
        booking_count = session.exec(select(func.count()).select_from(Booking)).one()
        quote_count = session.exec(select(func.count()).select_from(QuoteRequest)).one()
    assert booking_count == 1
    assert quote_count == 1

    availability = client.get(
        "/api/venues/grand-hall/availability",
        params={"date": BOOKING_PAYLOAD["date"]},
    )
    assert availability.json()["available"] is False
