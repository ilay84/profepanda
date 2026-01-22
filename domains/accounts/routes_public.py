from __future__ import annotations

import json
import secrets
from urllib import parse, request as urlrequest

from flask import Blueprint, current_app, redirect, render_template, request, session, url_for
from flask_login import login_user, logout_user
from werkzeug.security import generate_password_hash

from app.extensions.db import db
from domains.accounts.magic_links import consume_magic_link, generate_magic_link, send_magic_link
from domains.accounts.models import AdminUser

bp = Blueprint("public_auth", __name__)


def _base_url() -> str:
    base = (current_app.config.get("PUBLIC_BASE_URL") or "").strip()
    if base:
        return base.rstrip("/")
    return request.host_url.rstrip("/")


def _redirect_uri() -> str:
    explicit = (current_app.config.get("GOOGLE_REDIRECT_URI") or "").strip()
    if explicit:
        return explicit
    return f"{_base_url()}/auth/google/callback"


def _oauth_config_ready() -> bool:
    return bool(
        (current_app.config.get("GOOGLE_CLIENT_ID") or "").strip()
        and (current_app.config.get("GOOGLE_CLIENT_SECRET") or "").strip()
    )


def _get_or_create_user(email: str, name: str | None) -> AdminUser:
    user = AdminUser.query.filter_by(email=email).first()
    if user:
        if name and not (user.name or "").strip():
            user.name = name
            db.session.commit()
        return user

    user = AdminUser(
        email=email,
        name=name or email.split("@")[0],
        role="student",
        status="active",
        password_hash=generate_password_hash(secrets.token_urlsafe(32)),
    )
    db.session.add(user)
    db.session.commit()
    return user


@bp.get("/auth/login")
def login_page():
    next_url = request.args.get("next") or "/courses"
    oauth_ready = _oauth_config_ready()
    return render_template("auth/login.html", next_url=next_url, oauth_ready=oauth_ready)


@bp.get("/auth/google")
def google_start():
    if not _oauth_config_ready():
        return redirect(url_for("public_auth.login_page"))

    next_url = request.args.get("next") or "/courses"
    state = secrets.token_urlsafe(16)
    session["oauth_state"] = state
    session["oauth_next"] = next_url

    params = {
        "client_id": current_app.config["GOOGLE_CLIENT_ID"],
        "redirect_uri": _redirect_uri(),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
        "access_type": "online",
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + parse.urlencode(params)
    return redirect(auth_url)


@bp.get("/auth/google/callback")
def google_callback():
    if not _oauth_config_ready():
        return redirect(url_for("public_auth.login_page"))

    code = request.args.get("code")
    state = request.args.get("state")
    if not code or not state or state != session.get("oauth_state"):
        return redirect(url_for("public_auth.login_page"))

    token_payload = {
        "code": code,
        "client_id": current_app.config["GOOGLE_CLIENT_ID"],
        "client_secret": current_app.config["GOOGLE_CLIENT_SECRET"],
        "redirect_uri": _redirect_uri(),
        "grant_type": "authorization_code",
    }
    token_req = urlrequest.Request(
        "https://oauth2.googleapis.com/token",
        data=parse.urlencode(token_payload).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlrequest.urlopen(token_req, timeout=10) as resp:
            token_data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return redirect(url_for("public_auth.login_page"))

    access_token = token_data.get("access_token")
    if not access_token:
        return redirect(url_for("public_auth.login_page"))

    user_req = urlrequest.Request(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        method="GET",
    )
    try:
        with urlrequest.urlopen(user_req, timeout=10) as resp:
            profile = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return redirect(url_for("public_auth.login_page"))

    email = (profile.get("email") or "").strip().lower()
    name = profile.get("name") or ""
    if not email:
        return redirect(url_for("public_auth.login_page"))

    user = _get_or_create_user(email, name)
    login_user(user)

    next_url = session.pop("oauth_next", None) or "/courses"
    return redirect(next_url)


@bp.post("/auth/magic/start")
def magic_start():
    json_body = request.get_json(silent=True) or {}
    email = (request.form.get("email") or json_body.get("email") or "").strip().lower()
    next_url = request.form.get("next") or json_body.get("next") or "/courses"
    if not email:
        return redirect(url_for("public_auth.login_page"))

    token, _expires_at = generate_magic_link(email)
    link = f"{_base_url()}/auth/magic/callback?token={parse.quote(token)}&next={parse.quote(next_url)}"
    send_magic_link(email, link)
    return render_template("auth/magic_sent.html", email=email)


@bp.get("/auth/magic/callback")
def magic_callback():
    token = request.args.get("token") or ""
    next_url = request.args.get("next") or "/courses"
    if not token:
        return redirect(url_for("public_auth.login_page"))

    email = consume_magic_link(token)
    if not email:
        return redirect(url_for("public_auth.login_page"))

    user = _get_or_create_user(email, None)
    login_user(user)
    return redirect(next_url)


@bp.post("/auth/logout")
def logout():
    logout_user()
    next_url = request.form.get("next") or request.args.get("next") or "/"
    return redirect(next_url)
