from __future__ import annotations

import json
import sys
from pathlib import Path


def _load_json(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise SystemExit(f"Failed to read {path}: {exc}") from exc


def _ensure_list(value: object, label: str) -> list[dict]:
    if isinstance(value, list):
        return value
    raise SystemExit(f"{label} must be a JSON array.")


def _write_list(path: Path, items: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(items, indent=2, ensure_ascii=True), encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/import_lessons_app_data.py <path-to-export.json>")

    export_path = Path(sys.argv[1]).expanduser().resolve()
    if not export_path.exists():
        raise SystemExit(f"Export file not found: {export_path}")

    payload = _load_json(export_path)
    if not isinstance(payload, dict):
        raise SystemExit("Export must be a JSON object with courses, lessons, exercises arrays.")

    courses = _ensure_list(payload.get("courses"), "courses")
    lessons = _ensure_list(payload.get("lessons"), "lessons")
    exercises = _ensure_list(payload.get("exercises"), "exercises")

    data_root = (
        Path(__file__).resolve().parents[1]
        / "data"
        / "lessons_app"
    )

    _write_list(data_root / "courses.json", courses)
    _write_list(data_root / "lessons.json", lessons)
    _write_list(data_root / "exercises.json", exercises)

    progress_path = data_root / "progress.json"
    if not progress_path.exists():
        _write_list(progress_path, [])

    print("Imported Lessons App data:")
    print(f"- courses: {len(courses)}")
    print(f"- lessons: {len(lessons)}")
    print(f"- exercises: {len(exercises)}")
    print(f"- progress: {'existing' if progress_path.exists() else 'created'}")


if __name__ == "__main__":
    main()
