from __future__ import annotations

import re
from pathlib import Path


def _patch_index(index_path: Path) -> None:
    html = index_path.read_text(encoding="utf-8")
    if "lessons_app/overrides.css" not in html:
        html = html.replace(
            "</head>",
            '  <link rel="stylesheet" href="/static/lessons_app/overrides.css">\n</head>',
        )
    if 'rel="icon"' not in html:
        html = html.replace(
            "</head>",
            '  <link rel="icon" href="/static/assets/icons/logo.svg" type="image/svg+xml">\n'
            '  <meta name="theme-color" content="#80ac5f">\n</head>',
        )
    if "ppx-lessons-app" not in html:
        html = re.sub(r"<body(\s*)>", r'<body\1 class="ppx-lessons-app">', html, count=1)
    index_path.write_text(html, encoding="utf-8")


def _patch_js(js_path: Path) -> None:
    text = js_path.read_text(encoding="utf-8", errors="ignore")

    text = text.replace('"/logo.svg"', '"/static/assets/logo/header-logo.svg"')

    text = text.replace('"Home":"/"', '"Home":"/courses"')
    text = text.replace("Home:\"/\"", "Home:\"/courses\"")

    marker = "__PPX_ADMIN__"
    text = text.replace("/courses-admin", marker)
    text = text.replace("/admin", "/courses-admin")
    text = text.replace(marker, "/courses-admin")

    js_path.write_text(text, encoding="utf-8")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    bundle_root = root / "static" / "lessons_app"
    index_path = bundle_root / "index.html"
    assets_root = bundle_root / "assets"

    if not index_path.exists():
        raise SystemExit(f"Missing bundle index: {index_path}")

    _patch_index(index_path)

    if assets_root.exists():
        for js_path in assets_root.glob("*.js"):
            _patch_js(js_path)

    print("Patched Lessons App bundle.")


if __name__ == "__main__":
    main()
