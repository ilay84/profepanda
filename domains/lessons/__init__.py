from flask import Blueprint


bp_public = Blueprint("lessons_public", __name__, url_prefix="/lessons")
bp_api = Blueprint("lessons_api", __name__, url_prefix="/api/lessons")


def init_app(app):
    """Register blueprints for lessons domain.

    Wire this in the app factory when ready:
        from domains.lessons import init_app as lessons_init_app
        lessons_init_app(app)
    """
    # Import routes to attach handlers to blueprints
    from . import routes  # noqa: F401
    from . import api  # noqa: F401

    app.register_blueprint(bp_public)
    app.register_blueprint(bp_api)

