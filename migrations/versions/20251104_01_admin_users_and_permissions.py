"""admin users + permissions (RBAC) baseline

Revision ID: 20251104_01_admin_users_and_permissions
Revises: 
Create Date: 2025-11-04 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# Revision identifiers, used by Alembic.
revision = "20251104_01_admin_users_and_permissions"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ─────────────────────────────────────────────────────────────
    # admin_users
    # ─────────────────────────────────────────────────────────────
    op.create_table(
        "admin_users",
        sa.Column("id", sa.String(length=36), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            sa.String(length=16),
            nullable=False,
            server_default="author",  # author | editor | super
        ),
        sa.Column(
            "status",
            sa.String(length=16),
            nullable=False,
            server_default="active",  # active | disabled
        ),
        sa.Column("preferences", sa.JSON().with_variant(sa.Text(), "sqlite"), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    # Unique constraint on email already creates an index; no separate index needed.

    # ─────────────────────────────────────────────────────────────
    # admin_permissions (per-user overrides)
    # ─────────────────────────────────────────────────────────────
    op.create_table(
        "admin_permissions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("resource", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["admin_users.id"], name="fk_admin_permissions_user"),
        sa.UniqueConstraint("user_id", "resource", "action", name="uq_admin_permissions_user_resource_action"),
    )

    op.create_index(
        "ix_admin_permissions_user",
        "admin_permissions",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_admin_permissions_user", table_name="admin_permissions")
    op.drop_constraint("uq_admin_permissions_user_resource_action", "admin_permissions", type_="unique")
    op.drop_table("admin_permissions")

    op.drop_table("admin_users")

