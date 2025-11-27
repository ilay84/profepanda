from flask import render_template

from . import bp_public


@bp_public.get("/<slug>")
def lesson_player(slug: str):
    """Render the lesson player shell; client fetches lesson JSON by slug.

    The player JS will call `/api/lessons/<slug>` to load published content.
    """
    return render_template("lessons/player.html", lesson_slug=slug)

