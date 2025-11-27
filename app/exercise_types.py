"""
Registry of exercise types used by Admin (buttons, routing) and front-end loaders.

Each entry defines:
- key: type slug (e.g., 'tf', 'mcq', 'dictation')
- label: human-readable label
- new_endpoint: Flask endpoint name for the admin "new" builder route
- icon: relative static icon path for admin buttons
- player_js: client player module filename (for reference / future use)
"""
from __future__ import annotations

from typing import Dict, Any


def get_registry() -> Dict[str, Dict[str, Any]]:
    return {
        "tf": {
            "label": "True/False",
            "new_endpoint": "admin.admin_exercises_new_tf",
            "icon": "assets/icons/tf.svg",
            "player_js": "js/ppx-tf.js",
        },
        "mcq": {
            "label": "MCQ",
            "new_endpoint": "admin.admin_exercises_new_mcq",
            "icon": "assets/icons/mcq.svg",
            "player_js": "js/ppx-mcq.js",
        },
        "dnd": {
            "label": "Drag & Drop",
            "new_endpoint": "admin.admin_exercises_new_dnd",
            "icon": "assets/icons/dnd.svg",
            "player_js": "js/ppx-dnd.js",
        },
        "fitb": {
            "label": "Fill-in",
            "new_endpoint": "admin.admin_exercises_new_fitb",
            "icon": "assets/icons/fib.svg",
            "player_js": "js/ppx-fitb.js",
        },
        "dictation": {
            "label": "Dictation",
            "new_endpoint": "admin.admin_exercises_new_dictation",
            "icon": "assets/icons/dictation.svg",
            "player_js": "js/ppx-dictation.js",
        },
    }
