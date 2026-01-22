# Lessons App Build (WebApp Integration)

This WebApp serves the Lessons App bundle from `static/lessons_app`.

## Build steps (no changes inside the Lessons App repo)
Use the build script inside the WebApp (it copies the Lessons App, applies API overrides, and builds):

```powershell
cd "C:\Users\eeley\Documents\ProfePanda\ProfePanda WebApp (new build)"
.\scripts\build_lessons_app_bundle.ps1
python scripts/verify_lessons_app_bundle.py
```

## Optional: import Lessons App data export
If you have a JSON export of courses/lessons/exercises, run:

```powershell
cd "C:\Users\eeley\Documents\ProfePanda\ProfePanda WebApp (new build)"
python scripts/validate_lessons_app_export.py "C:\path\to\lessons-export.json"
python scripts/import_lessons_app_data.py "C:\path\to\lessons-export.json"
```

Export format:

```json
{
  "courses": [],
  "lessons": [],
  "exercises": []
}
```

## Admin route note
The Lessons App admin UI uses `/admin`, which is already occupied by the Flask admin.
The build script rebases Lessons App admin routes to `/courses-admin` automatically.
