from __future__ import annotations

import sys
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    bundle_root = root / "static" / "lessons_app"
    index_path = bundle_root / "index.html"

    if not bundle_root.exists():
        raise SystemExit(f"Missing bundle folder: {bundle_root}")
    if not index_path.exists():
        raise SystemExit(f"Missing bundle index: {index_path}")

    assets = list(bundle_root.rglob("*"))
    asset_count = sum(1 for p in assets if p.is_file())
    print("Lessons App bundle looks present.")
    print(f"- index: {index_path}")
    print(f"- files: {asset_count}")


if __name__ == "__main__":
    main()
