from datetime import datetime

from app.extensions.db import db


class Unit(db.Model):
    __tablename__ = "lesson_units"
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(255), unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    locale = db.Column(db.String(8), nullable=False, default="es")
    taxonomy_json = db.Column(db.JSON, nullable=True)
    created_by = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Lesson(db.Model):
    __tablename__ = "lessons"
    id = db.Column(db.Integer, primary_key=True)
    unit_id = db.Column(db.Integer, db.ForeignKey("lesson_units.id"), nullable=True)
    slug = db.Column(db.String(255), unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    locale = db.Column(db.String(8), nullable=False, default="es")
    status = db.Column(db.String(32), nullable=False, default="draft")
    version = db.Column(db.Integer, nullable=False, default=1)
    json = db.Column(db.JSON, nullable=False)
    communicative_goal = db.Column(db.String(255), nullable=True)
    created_by = db.Column(db.Integer, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = db.Column(db.DateTime, nullable=True)


class UserProgress(db.Model):
    __tablename__ = "lesson_user_progress"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey("lessons.id"), nullable=False)
    current_slide = db.Column(db.String(64), nullable=True)
    score = db.Column(db.Float, nullable=True)
    accuracy = db.Column(db.Float, nullable=True)
    completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson"),)


class UserAttempt(db.Model):
    __tablename__ = "lesson_user_attempts"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey("lessons.id"), nullable=False)
    slide_id = db.Column(db.String(64), nullable=False)
    payload_json = db.Column(db.JSON, nullable=True)
    correct = db.Column(db.Boolean, nullable=True)
    score_delta = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Badge(db.Model):
    __tablename__ = "lesson_badges"
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    icon_url = db.Column(db.String(512), nullable=True)
    criteria_json = db.Column(db.JSON, nullable=True)


class UserBadge(db.Model):
    __tablename__ = "lesson_user_badges"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    badge_id = db.Column(db.Integer, db.ForeignKey("lesson_badges.id"), nullable=False)
    awarded_at = db.Column(db.DateTime, default=datetime.utcnow)


class LessonEvent(db.Model):
    __tablename__ = "lesson_events"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey("lessons.id"), nullable=True)
    type = db.Column(db.String(64), nullable=False)
    meta_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

