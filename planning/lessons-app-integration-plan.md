# Lessons App Integration Plan (Full Replacement)

## Goals
- Replace ProfePanda exercises, articles, and grammar resources with the Lessons App content and exercise options.
- Make /courses and lesson flows behave exactly like the Lessons App, including exercise types and player behavior.
- Use WebApp auth and routing while removing legacy resource surfaces from the UI.

## Replacement Mandate (Scope)
- Deprecate and remove from navigation and routing:
  - /exercises (public exercises index and exercise modal flows)
  - article and grammar resource pages (public content hub and related modules)
- The only learning content surface is the Lessons App course and lesson system under /courses.
- Existing legacy content files can remain on disk for archival, but should no longer be reachable or referenced.

## Current State Inventory

### WebApp (ProfePanda WebApp)
- Legacy content surfaces:
  - Exercises: domains/public exercises index and ppx exercise system (static/js/ppx-*)
  - Articles/grammar: public content hub templates and content modules
- Courses domain: file based JSON in data/courses/<course_slug>/course.json and data/courses/<course_slug>/lessons/<lesson_slug>/lesson.json.
- Lesson player domain: domains/lessons + static/js/lesson_player (custom exercise modes, not the Lessons App set).

### Lessons App (ProfePanda Lessons App)
- React SPA with Tailwind (Vite).
- Routes: /courses, /courses/:courseId, /lesson/:lessonId.
- Exercise/content types used: multiple_choice, fill_blank, translation, matching, explanation.

## Recommended Integration Strategy (Updated)

Primary (recommended): mount the Lessons App UI and exercise engine under /courses and retire the legacy ProfePanda exercise/content system.
- Build the Lessons App into static assets and serve it from Flask under /courses.
- Provide WebApp-backed API endpoints that mirror Lessons App services.
- Deactivate legacy exercise and article/grammar pages and remove navigation links.

Alternative (only if React bundle is not desired): reimplement Lessons App exercise types in the existing WebApp lesson_player.
- This means replacing lesson_player exercise modes with Lessons App types and removing all legacy ppx exercise JS.
- Higher engineering risk and longer parity work than bundling the Lessons App.

## Data Model Alignment (Lessons App as Source of Truth)

### Courses
- Use Lessons App course fields directly:
  - id, title, description, level, source_language, target_language, image_url, is_published
- Store in DB or JSON with a schema that matches Lessons App expectations.

### Lessons and Exercises
- Use Lessons App lesson and exercise schemas as authoritative.
- Store lessons with exercises in a normalized structure:
  - Lesson: id, course_id, title, description, xp_reward, is_published, order
  - Exercises: lesson_id, type, prompt/question, options, correct_answer, hint, etc.
- Avoid mixing legacy exercise formats (ppx exercise types, lesson_player slides).

### Progress
- Replace localStorage progress with server-backed progress:
  - per user: completed lessons, XP, streaks
  - per lesson: attempts and completion
- Provide APIs so the Lessons App UI can read/write progress.

## Routing Plan (Replacement)
- /courses -> Lessons App UI entry (SPA shell)
- /courses/<courseId> -> handled by Lessons App router
- /lesson/<lessonId> -> handled by Lessons App router
- Legacy routes:
  - /exercises and article/grammar routes should redirect to /courses or return 410

## API and Service Layer Changes
- Implement Lessons App service endpoints in Flask (or adapt the Lessons App services to new endpoints):
  - GET /api/courses (published courses)
  - GET /api/courses/:courseId
  - GET /api/courses/:courseId/lessons
  - GET /api/lessons/:lessonId
  - GET /api/lessons/:lessonId/exercises
  - POST /api/progress/lesson-complete
  - GET /api/progress/user
- Auth endpoint for current user:
  - GET /api/me (replace Lessons App auth shim)

## Migration Steps (Full Replacement)
1) Export Lessons App seed data (courses, lessons, exercises) into a migration JSON.
2) Create DB tables or file storage that matches Lessons App schemas.
3) Import the lessons data into WebApp storage.
4) Build Lessons App and serve under /courses.
5) Remove/redirect legacy exercises and article/grammar routes and navigation.
6) Validate course list, course detail, lesson player, and progress end-to-end.

## Implementation Phases

Phase 1 - Frontend shell and routing
- Build Lessons App and host its assets in static/.
- Add Flask route to serve the Lessons App index at /courses and allow client-side routing.
- Add a catch-all for /courses/* and /lesson/* that serves the Lessons App shell.

Phase 2 - API parity
- Implement API endpoints that match Lessons App services.
- Replace Lessons App localStorage services with API calls.
- Add /api/me and progress endpoints.

Phase 3 - Data migration
- Define schemas for courses, lessons, exercises in WebApp.
- Migrate current Lessons App content into WebApp storage.

Phase 4 - Decommission legacy content
- Remove navigation entries for exercises, articles, grammar.
- Redirect or 410 old routes.
- Remove usage of ppx exercise JS and content hub templates.

Phase 5 - UX polish and QA
- Confirm parity of course list, course detail, lesson player, and completion flow.
- Validate progress, XP, and streak behavior.

## Open Decisions (Required)
- Where to store Lessons App data: DB tables vs JSON files.
- Whether to embed the Lessons App bundle (recommended) or reimplement its exercise types in the current lesson_player.
