from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from urllib import request as urlrequest
import json

from flask import current_app, request

from app.storage import get_data_root, read_json, write_json

TOKENS_PATH = get_data_root() / "auth" / "magic_links.json"


def _now() -> datetime:
    return datetime.utcnow()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _load_tokens() -> list[dict[str, Any]]:
    data = read_json(TOKENS_PATH)
    if not isinstance(data, list):
        return []
    return data


def _save_tokens(tokens: list[dict[str, Any]]) -> bool:
    return write_json(TOKENS_PATH, tokens, pretty=True)


def _purge_expired(tokens: list[dict[str, Any]]) -> list[dict[str, Any]]:
    now = _now()
    cleaned = []
    for item in tokens:
        expires_at = item.get("expires_at")
        used_at = item.get("used_at")
        if used_at:
            continue
        try:
            exp_dt = datetime.fromisoformat(expires_at)
        except Exception:
            continue
        if exp_dt <= now:
            continue
        cleaned.append(item)
    return cleaned


def generate_magic_link(email: str) -> tuple[str, str]:
    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)

    ttl_seconds = int(current_app.config.get("MAGIC_LINK_TTL_SECONDS", 900))
    expires_at = _now() + timedelta(seconds=ttl_seconds)

    tokens = _load_tokens()
    tokens = _purge_expired(tokens)
    tokens.append(
        {
            "token_hash": token_hash,
            "email": email,
            "created_at": _now().isoformat(),
            "expires_at": expires_at.isoformat(),
            "used_at": None,
            "ip": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", ""),
        }
    )
    _save_tokens(tokens)
    return token, expires_at.isoformat()


def consume_magic_link(token: str) -> str | None:
    token_hash = _hash_token(token)
    tokens = _load_tokens()
    tokens = _purge_expired(tokens)
    for item in tokens:
        if item.get("token_hash") == token_hash and not item.get("used_at"):
            item["used_at"] = _now().isoformat()
            _save_tokens(tokens)
            return item.get("email")
    _save_tokens(tokens)
    return None


def send_magic_link(email: str, link: str) -> bool:
    api_key = current_app.config.get("RESEND_API_KEY", "")
    from_email = current_app.config.get("RESEND_FROM_EMAIL", "")
    if not api_key or not from_email:
        return False

    subject = "Your ProfePanda login link"
    html = (
        "<p>Use this link to log in to ProfePanda:</p>"
        f"<p><a href=\"{link}\">Log in</a></p>"
        "<p>This link expires soon for your security.</p>"
    )
    payload = {
        "from": from_email,
        "to": [email],
        "subject": subject,
        "html": html,
    }

    req = urlrequest.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlrequest.urlopen(req, timeout=10) as resp:
            return 200 <= resp.status < 300
    except Exception:
        return False
