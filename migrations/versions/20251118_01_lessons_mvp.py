"""lessons MVP tables

Revision ID: 20251118_01_lessons_mvp
Revises: 20251104_01_admin_users_and_permissions
Create Date: 2025-11-18 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# Revision identifiers, used by Alembic.
revision = "20251118_01_lessons_mvp"
down_revision = "20251104_01_admin_users_and_permissions"
branch_labels = None
depends_on = None


JSONType = sa.JSON().with_variant(sa.Text(), "sqlite")


def upgrade() -> None:
    # Units
    op.create_table(
        "lesson_units",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("slug", sa.String(length=255), nullable=False, unique=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("locale", sa.String(length=8), nullable=False, server_default="es"),
        sa.Column("taxonomy_json", JSONType, nullable=True),
        sa.Column("created_by", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    # Lessons
    op.create_table(
        "lessons",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("unit_id", sa.Integer, sa.ForeignKey("lesson_units.id"), nullable=True),
        sa.Column("slug", sa.String(length=255), nullable=False, unique=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("locale", sa.String(length=8), nullable=False, server_default="es"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("json", JSONType, nullable=False),
        sa.Column("communicative_goal", sa.String(length=255), nullable=True),
        sa.Column("created_by", sa.Integer, nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_lessons_unit_status_locale", "lessons", ["unit_id", "status", "locale"], unique=False)

    # User progress
    op.create_table(
        "lesson_user_progress",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, nullable=False),
        sa.Column("lesson_id", sa.Integer, sa.ForeignKey("lessons.id"), nullable=False),
        sa.Column("current_slide", sa.String(length=64), nullable=True),
        sa.Column("score", sa.Float, nullable=True),
        sa.Column("accuracy", sa.Float, nullable=True),
        sa.Column("completed", sa.Boolean, nullable=False, server_default=sa.text("0")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson"),
    )
    op.create_index("ix_progress_user", "lesson_user_progress", ["user_id"], unique=False)

    # Attempts
    op.create_table(
        "lesson_user_attempts",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, nullable=False),
        sa.Column("lesson_id", sa.Integer, sa.ForeignKey("lessons.id"), nullable=False),
        sa.Column("slide_id", sa.String(length=64), nullable=False),
        sa.Column("payload_json", JSONType, nullable=True),
        sa.Column("correct", sa.Boolean, nullable=True),
        sa.Column("score_delta", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_attempts_user_lesson_slide", "lesson_user_attempts", ["user_id", "lesson_id", "slide_id"], unique=False)

    # Badges
    op.create_table(
        "lesson_badges",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("slug", sa.String(length=255), nullable=False, unique=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("icon_url", sa.String(length=512), nullable=True),
        sa.Column("criteria_json", JSONType, nullable=True),
    )
    op.create_table(
        "lesson_user_badges",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, nullable=False),
        sa.Column("badge_id", sa.Integer, sa.ForeignKey("lesson_badges.id"), nullable=False),
        sa.Column("awarded_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    # Events (internal analytics)
    op.create_table(
        "lesson_events",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, nullable=True),
        sa.Column("lesson_id", sa.Integer, sa.ForeignKey("lessons.id"), nullable=True),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("meta_json", JSONType, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_lesson_events_lesson", "lesson_events", ["lesson_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_lesson_events_lesson", table_name="lesson_events")
    op.drop_table("lesson_events")

    op.drop_table("lesson_user_badges")
    op.drop_table("lesson_badges")

    op.drop_index("ix_attempts_user_lesson_slide", table_name="lesson_user_attempts")
    op.drop_table("lesson_user_attempts")

    op.drop_index("ix_progress_user", table_name="lesson_user_progress")
    op.drop_table("lesson_user_progress")

    op.drop_index("ix_lessons_unit_status_locale", table_name="lessons")
    op.drop_table("lessons")

    op.drop_table("lesson_units")

