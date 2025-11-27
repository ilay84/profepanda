# domains/accounts/routes_admin.py
from __future__ import annotations
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from app.extensions.db import db
from domains.accounts.models import AdminUser

bp = Blueprint("accounts", __name__)

@bp.get("/login")
def login_page():
    # Renders the login form (template added in a later step)
    return render_template("admin/auth/login.html")

@bp.post("/login")
def login_submit():
    email = (request.form.get("email") or "").strip().lower()
    password = request.form.get("password") or ""
    # Safer fallback: avoid BuildError if admin_index endpoint is not defined
    next_url = request.args.get("next") or "/admin"

    user = AdminUser.query.filter_by(email=email).first()
    if not user or not user.check_password(password) or user.status != "active":
        flash("Email o contraseña inválidos.", "error")
        return redirect(url_for("accounts.login_page"))

    login_user(user)
    flash("Sesión iniciada.", "success")
    return redirect(next_url)

@bp.post("/logout")
@login_required
def logout_submit():
    logout_user()
    flash("Sesión cerrada.", "info")
    return redirect(url_for("accounts.login_page"))

@bp.get("/profile")
@login_required
def profile_page():
    # Simple profile page (template added in a later step)
    return render_template("admin/account/profile.html", user=current_user)

@bp.post("/profile")
@login_required
def profile_submit():
    name = (request.form.get("name") or "").strip()
    if name:
        current_user.name = name
        db.session.commit()
        flash("Perfil actualizado.", "success")
    else:
        flash("El nombre no puede estar vacío.", "error")
    return redirect(url_for("accounts.profile_page"))
