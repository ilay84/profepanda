export const COURSE_LEVELS = ["beginner", "intermediate", "advanced"];

export function normalizeCourse(input = {}) {
  const level = COURSE_LEVELS.includes(input.level) ? input.level : "beginner";

  return {
    id: input.id ?? "",
    title: input.title ?? "",
    description: input.description ?? "",
    source_language: input.source_language ?? "",
    target_language: input.target_language ?? "",
    level,
    image_url: input.image_url ?? "",
    is_published: Boolean(input.is_published),
    order: typeof input.order === "number" ? input.order : 0,
    is_enrolled: Boolean(input.is_enrolled),

    // TEMP / migration-friendly progress fields (safe defaults)
    total_lessons: typeof input.total_lessons === "number" ? input.total_lessons : 0,
    completed_lessons: typeof input.completed_lessons === "number" ? input.completed_lessons : 0,
    progress_percent: typeof input.progress_percent === "number" ? input.progress_percent : 0,
    is_mastered: Boolean(input.is_mastered),
  };
}

export function isValidCourse(course) {
  return Boolean(course?.title && course?.source_language && course?.target_language);
}
