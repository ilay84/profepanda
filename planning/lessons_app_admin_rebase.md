# Lessons App Admin Rebase

The Lessons App admin UI is rebased to `/courses-admin` during the WebApp build step.

Build flow:
- `scripts/build_lessons_app_bundle.ps1` copies the Lessons App into a temp folder.
- It rewrites `/admin` routes to `/courses-admin` inside the temp copy.
- The bundle is built and copied to `static/lessons_app`.

Health checks:
- `/healthz/lessons-app` confirms the bundle is present.
- `/healthz/lessons-app-admin` confirms `/courses-admin` appears in the bundle.
