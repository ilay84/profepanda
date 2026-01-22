// src/entities/UserProgress.js

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v ?? "")).filter((v) => v.trim().length > 0);
}

export function normalizeUserProgress(input = {}) {
  return {
    id: input.id ?? "",
    user_email: input.user_email ?? "",
    course_id: input.course_id ?? "",
    completed_lessons: normalizeStringArray(input.completed_lessons),
    total_xp: typeof input.total_xp === "number" ? input.total_xp : 0,
    current_streak: typeof input.current_streak === "number" ? input.current_streak : 0,
    last_activity_date: input.last_activity_date ?? "",
    enrolled_date: input.enrolled_date ?? "",
  };
}

export function isValidUserProgress(progress) {
  return Boolean(progress?.user_email && progress?.course_id);
}
