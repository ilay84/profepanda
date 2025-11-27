# domains/taxonomy/routes.py
from __future__ import annotations

from flask import Blueprint, jsonify, request, abort
from typing import Dict, Any, List

from common.taxonomy import load_taxonomy, node_for, children_of, title_for, breadcrumb

bp = Blueprint("taxonomy", __name__)

def _serialize_node(n: Dict[str, Any], lang: str | None = None) -> Dict[str, Any]:
    data = {
        "path": n.get("path", ""),
        "title": n.get("title", {"es": "", "en": ""}),
        "has_children": False,
    }
    # detect children using the indexed map
    tx = load_taxonomy("grammar")
    parent_key = n["path"]
    data["has_children"] = len(tx["children"].get(parent_key, [])) > 0
    # optional computed display title
    if lang in ("es", "en"):
        data["display_title"] = title_for(n["path"], lang=lang)
    return data


@bp.route("/grammar", methods=["GET"])
def grammar_root() -> Any:
    """
    List top-level grammar categories.
    Optional: ?lang=es|en to include display_title.
    """
    lang = request.args.get("lang")
    tx = load_taxonomy("grammar")
    roots = children_of(None)  # H2 roots
    return jsonify({
        "name": tx["raw"].get("name", "grammar"),
        "version": tx["raw"].get("version", 1),
        "roots": [_serialize_node(n, lang=lang) for n in roots],
    })


@bp.route("/grammar/<path:topic>", methods=["GET"])
def grammar_topic(topic: str) -> Any:
    """
    Return a specific topic node, its breadcrumb, and its immediate children.
    Optional: ?lang=es|en to include display_title.
    """
    lang = request.args.get("lang")
    topic = (topic or "").strip().strip("/")
    n = node_for(topic)
    if not n:
        abort(404, description=f"Unknown grammar topic: {topic}")

    kids = children_of(topic)
    return jsonify({
        "node": _serialize_node(n, lang=lang),
        "breadcrumb": [
            {"path": p, "title": title_for(p, lang=lang or "es")}
            for (p, _) in breadcrumb(topic, lang=lang or "es")
        ],
        "children": [_serialize_node(c, lang=lang) for c in kids],
    })

@bp.route("/grammar/browse", methods=["GET"])
def grammar_browse() -> str:
    from flask import render_template

    lang = request.args.get("lang") or "es"
    topic = (request.args.get("topic") or "").strip().strip("/")

    if topic:
        n = node_for(topic)
        if not n:
            abort(404, description=f"Unknown grammar topic: {topic}")
        children = children_of(topic)
        breadcrumb_list = [
            {"path": p, "title": title_for(p, lang=lang or "es")}
            for (p, _) in breadcrumb(topic, lang=lang or "es")
        ]
        title = title_for(topic, lang=lang)
    else:
        n = None
        children = children_of(None)
        breadcrumb_list = []
        title = title_for("grammar", lang=lang) or "Grammar"

    for c in children:
        c["display_title"] = title_for(c.get("path"), lang=lang)

    return render_template(
        "taxonomy/grammar_browse.html",
        lang=lang,
        topic=topic,
        title=title,
        breadcrumb=breadcrumb_list,
        children=children,
    )
