"""Shared isolated database and API client fixtures."""
import os
import tempfile
from collections.abc import Generator
from pathlib import Path

import pytest

TEST_DIR = Path(tempfile.mkdtemp(prefix="venue-backend-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DIR / 'test.db'}"
os.environ["ADMIN_API_KEY"] = "test-admin-key"

from fastapi.testclient import TestClient  # noqa: E402
from sqlmodel import SQLModel  # noqa: E402

from app.database import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    SQLModel.metadata.drop_all(engine)
    seed()
    with TestClient(app) as test_client:
        yield test_client
