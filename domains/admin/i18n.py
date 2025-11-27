# domains/admin/i18n.py
from __future__ import annotations

from flask import request, jsonify, abort
from flask_login import login_required, current_user
from . import bp  # existing admin blueprint
from app.langs import ui_get_pair, ui_update_pair

import base64
import re
from pathlib import Path
from datetime import datetime, timezone
from app.storage import get_data_root


def _require_admin() -> None:
    """
    Allow only authenticated admin users.
    Roles allowed: author | editor | super, and status must be active.
    """
    role = getattr(current_user, "role", None)
    status = getattr(current_user, "status", None)
    if not (getattr(current_user, "is_authenticated", False) and status == "active" and role in {"author", "editor", "super"}):
        abort(403)


@bp.get("/i18n/key/<path:key>")
@login_required
def admin_i18n_get_key(key: str):
    _require_admin()
    pair = ui_get_pair((key or "").strip())
    return jsonify(pair), 200


# Optional fallback: /admin/i18n/key?key=home.hero.title
@bp.get("/i18n/key")
@login_required
def admin_i18n_get_query():
    _require_admin()
    key = (request.args.get("key") or "").strip()
    if not key:
        return jsonify({"error": "missing key"}), 400
    pair = ui_get_pair(key)
    return jsonify(pair), 200


@bp.post("/i18n/update")
@login_required
def admin_i18n_update():
    _require_admin()
    data = request.get_json(silent=True) or {}
    key = (data.get("key") or "").strip()
    if not key:
        return jsonify({"ok": False, "error": "missing key"}), 400

    # Branch: image upload vs text pair update
    update_type = (data.get("type") or "").strip().lower()

    if update_type == "image":
        data_url = (data.get("image_data_url") or "").strip()
        orig_name = (data.get("filename") or "upload").strip()

        # Validate and decode data URL
        m = re.match(r"^data:(image/(png|jpeg|jpg|webp|gif));base64,(.+)$", data_url, re.IGNORECASE)
        if not m:
            return jsonify({"ok": False, "error": "invalid image data"}), 400

        mime = m.group(1).lower()
        ext = {
            "image/png": "png",
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/webp": "webp",
            "image/gif": "gif",
        }.get(mime, "bin")

        try:
            blob = base64.b64decode(m.group(3), validate=True)
        except Exception:
            return jsonify({"ok": False, "error": "bad base64 payload"}), 400

        # Namespace by first token of key (e.g., "home.cards.articles.image" -> "home")
        ns = key.split(".")[0] if "." in key else "ui"

        def _slugify(s: str) -> str:
            s = s.strip().lower()
            s = re.sub(r"[^\w\s\-\.]+", "", s, flags=re.UNICODE)  # drop weird chars
            s = s.replace(".", "-")
            s = re.sub(r"\s+", "-", s)
            s = re.sub(r"-{2,}", "-", s)
            return s.strip("-") or "asset"

        key_slug = _slugify(key)
        ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        filename = f"{key_slug}_{ts}.{ext}"

        # Save under data/ui/<ns>/media/img/<filename>
        img_dir = get_data_root() / "ui" / _slugify(ns) / "media" / "img"
        img_dir.mkdir(parents=True, exist_ok=True)
        out_path = img_dir / filename
        try:
            out_path.write_bytes(blob)
        except Exception as e:
            return jsonify({"ok": False, "error": f"write failed: {e}"}), 500

        # Public URL via media blueprint
        public_url = f"/media/ui/{_slugify(ns)}/img/{filename}"

        # Persist URL into both ES/EN so ui(key, ...) resolves uniformly
        try:
            ui_update_pair(key, public_url, public_url)
        except Exception as e:
            return jsonify({"ok": False, "error": f"persist failed: {e}"}), 500

        return jsonify({"ok": True, "image_url": public_url}), 200

    # Fallback: text pair update
    es = (data.get("es") or "").strip()
    en = (data.get("en") or "").strip()
    try:
        ui_update_pair(key, es, en)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

    return jsonify({"ok": True}), 200
