"""preserve venue event type display order

Revision ID: b2f42077bb9e
Revises: 4c2910f6f913
Create Date: 2026-06-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2f42077bb9e"
down_revision: Union[str, Sequence[str], None] = "4c2910f6f913"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("venue_event_types") as batch_op:
        batch_op.add_column(
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0")
        )


def downgrade() -> None:
    with op.batch_alter_table("venue_event_types") as batch_op:
        batch_op.drop_column("sort_order")
