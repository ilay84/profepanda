from __future__ import annotations

import json
import sys
from pathlib import Path


def _load_json(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise SystemExit(f"Failed to read {path}: {exc}") from exc


def _require_list(value: object, label: str) -> list[dict]:
    if isinstance(value, list):
        return value
    raise SystemExit(f"{label} must be a JSON array.")


def _check_required(item: dict, required: list[str], label: str, idx: int, errors: list[str]) -> None:
    for key in required:
        if not str(item.get(key) or "").strip():
            errors.append(f"{label}[{idx}] missing required field: {key}")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/validate_lessons_app_export.py <path-to-export.json>")

    export_path = Path(sys.argv[1]).expanduser().resolve()
    if not export_path.exists():
        raise SystemExit(f"Export file not found: {export_path}")

    payload = _load_json(export_path)
    if not isinstance(payload, dict):
        raise SystemExit("Export must be a JSON object with courses, lessons, exercises arrays.")

    courses = _require_list(payload.get("courses"), "courses")
    lessons = _require_list(payload.get("lessons"), "lessons")
    exercises = _require_list(payload.get("exercises"), "exercises")

    errors: list[str] = []
    warnings: list[str] = []

    for idx, course in enumerate(courses):
        if not isinstance(course, dict):
            errors.append(f"courses[{idx}] must be an object.")
            continue
        _check_required(course, ["id", "title", "source_language", "target_language"], "courses", idx, errors)

    for idx, lesson in enumerate(lessons):
        if not isinstance(lesson, dict):
            errors.append(f"lessons[{idx}] must be an object.")
            continue
        _check_required(lesson, ["id", "course_id", "title"], "lessons", idx, errors)

    for idx, exercise in enumerate(exercises):
        if not isinstance(exercise, dict):
            errors.append(f"exercises[{idx}] must be an object.")
            continue
        _check_required(exercise, ["id", "lesson_id", "type"], "exercises", idx, errors)
        ex_type = str(exercise.get("type") or "").strip()
        if ex_type == "multiple_choice":
            if not exercise.get("options"):
                warnings.append(f"exercises[{idx}] multiple_choice missing options.")
            if not str(exercise.get("correct_answer") or "").strip():
                warnings.append(f"exercises[{idx}] multiple_choice missing correct_answer.")
        elif ex_type in {"fill_blank", "translation"}:
            if not str(exercise.get("correct_answer") or "").strip():
                warnings.append(f"exercises[{idx}] {ex_type} missing correct_answer.")
        elif ex_type == "matching":
            if not exercise.get("matching_pairs"):
                warnings.append(f"exercises[{idx}] matching missing matching_pairs.")
        elif ex_type == "explanation":
            if not str(exercise.get("explanation_content") or "").strip():
                warnings.append(f"exercises[{idx}] explanation missing explanation_content.")

    if errors:
        print("Validation failed:")
        for err in errors:
            print(f"- {err}")
        raise SystemExit(1)

    print("Validation passed.")
    if warnings:
        print("Warnings:")
        for warn in warnings:
            print(f"- {warn}")


if __name__ == "__main__":
    main()
