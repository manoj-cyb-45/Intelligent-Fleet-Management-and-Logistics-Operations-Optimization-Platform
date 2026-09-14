"""add scheduled_start_time to shipments table

Revision ID: e1a2b3c4d5e6
Revises: d96c2c99e126
Create Date: 2026-09-13 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'd96c2c99e126'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'shipments',
        sa.Column('scheduled_start_time', sa.DateTime(), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('shipments', 'scheduled_start_time')
