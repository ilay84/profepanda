# domains/accounts/routes_manage.py
from __future__ import annotations
from flask import Blueprint, render_template
from flask_login import login_required
from app.extensions.db import db
from domains.accounts.models import AdminUser
from domains.accounts.authz import require_super

bp = Blueprint("accounts_manage", __name__)

@bp.get("/users")
@login_required
@require_super()
def users_index():
    """List all admin users (super-admin only)."""
    from flask import request

    search = (request.args.get("q") or "").strip()
    role = (request.args.get("role") or "").strip()
    status = (request.args.get("status") or "").strip()

    query = AdminUser.query
    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(
                AdminUser.id.ilike(like),
                AdminUser.email.ilike(like),
                AdminUser.name.ilike(like),
            )
        )
    if role and role != "all":
        query = query.filter(AdminUser.role == role)
    if status and status != "all":
        query = query.filter(AdminUser.status == status)

    users = query.order_by(AdminUser.created_at.desc()).all()
    return render_template(
        "admin/account/users_index.html",
        users=users,
        search=search,
        role_filter=role,
        status_filter=status,
    )

@bp.get("/users/new")
@login_required
@require_super()
def users_new():
    """Render form to create a new admin user."""
    return render_template("admin/account/users_new.html")


@bp.post("/users/new")
@login_required
@require_super()
def users_create():
    """Handle creation of a new admin user."""
    from flask import request, redirect, url_for, flash
    from werkzeug.security import generate_password_hash

    email = (request.form.get("email") or "").strip().lower()
    name = (request.form.get("name") or "").strip()
    role = (request.form.get("role") or "author").strip()
    status = (request.form.get("status") or "active").strip()
    password = (request.form.get("password") or "").strip()

    if not email or not name or not password:
        flash("Todos los campos son obligatorios.", "error")
        return redirect(url_for("accounts_manage.users_new"))

    from domains.accounts.models import AdminUser
    existing = AdminUser.query.filter_by(email=email).first()
    if existing:
        flash("Ya existe un usuario con ese correo.", "error")
        return redirect(url_for("accounts_manage.users_new"))

    user = AdminUser(
        email=email,
        name=name,
        role=role,
        status=status,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.commit()
    flash("Usuario creado correctamente.", "success")
    return redirect(url_for("accounts_manage.users_index"))

@bp.get("/users/<user_id>/edit")
@login_required
@require_super()
def users_edit(user_id: str):
    """Render form to edit an admin user."""
    from flask import abort, render_template
    from domains.accounts.models import AdminUser

    user = AdminUser.query.get(user_id)
    if not user:
        abort(404)
    return render_template("admin/account/users_edit.html", user=user)


@bp.post("/users/<user_id>/edit")
@login_required
@require_super()
def users_update(user_id: str):
    """Handle updates to an admin user (name, role, status, optional password)."""
    from flask import request, redirect, url_for, flash
    from domains.accounts.models import AdminUser

    user = AdminUser.query.get(user_id)
    if not user:
        flash("Usuario no encontrado.", "error")
        return redirect(url_for("accounts_manage.users_index"))

    name = (request.form.get("name") or "").strip()
    role = (request.form.get("role") or "").strip() or user.role
    status = (request.form.get("status") or "").strip() or user.status
    password = (request.form.get("password") or "").strip()

    if not name:
        flash("El nombre no puede estar vacío.", "error")
        return redirect(url_for("accounts_manage.users_edit", user_id=user.id))

    user.name = name
    user.role = role
    user.status = status
    if password:
        user.set_password(password)

    db.session.commit()
    flash("Usuario actualizado.", "success")
    return redirect(url_for("accounts_manage.users_index"))


