"""enforce one active quote hold per venue and date

Revision ID: 4c2910f6f913
Revises: 8adb96b11705
Create Date: 2026-06-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4c2910f6f913"
down_revision: Union[str, Sequence[str], None] = "8adb96b11705"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "uq_quote_active_per_day",
        "quote_requests",
        ["venue_id", "date"],
        unique=True,
        postgresql_where=sa.text("status IN ('new', 'contacted')"),
        sqlite_where=sa.text("status IN ('new', 'contacted')"),
    )


def downgrade() -> None:
    op.drop_index("uq_quote_active_per_day", table_name="quote_requests")
