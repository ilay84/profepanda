# domains/accounts/models.py
from __future__ import annotations
import uuid
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions.db import db


class AdminUser(db.Model, UserMixin):
    __tablename__ = "admin_users"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)

    # Roles: author | editor | super
    role = db.Column(db.String(16), nullable=False, default="author")

    # Status: active | disabled
    status = db.Column(db.String(16), nullable=False, default="active")

    # Free-form preferences (e.g., UI language, theme, palette)
    preferences = db.Column(db.JSON, nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=db.func.current_timestamp())
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=db.func.current_timestamp(),
        onupdate=db.func.current_timestamp(),
    )

    # Relationship: per-user permission overrides
    permissions = db.relationship(
        "AdminPermission",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    # Flask-Login requirement
    def get_id(self) -> str:
        return self.id

    # Password helpers
    def set_password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)

    @property
    def is_active(self) -> bool:
        return self.status == "active"

    def __repr__(self) -> str:
        return f"<AdminUser {self.email} role={self.role}>"


class AdminPermission(db.Model):
    __tablename__ = "admin_permissions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(36), db.ForeignKey("admin_users.id"), nullable=False)
    resource = db.Column(db.String(64), nullable=False)
    action = db.Column(db.String(64), nullable=False)

    user = db.relationship("AdminUser", back_populates="permissions")

    __table_args__ = (
        db.UniqueConstraint("user_id", "resource", "action", name="uq_admin_permissions_user_resource_action"),
    )

    def __repr__(self) -> str:
        return f"<AdminPermission user={self.user_id} {self.resource}:{self.action}>"
