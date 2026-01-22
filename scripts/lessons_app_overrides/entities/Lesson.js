export function normalizeLesson(input = {}) {
  return {
    id: input.id ?? "",
    course_id: input.course_id ?? "",
    unit_id: input.unit_id ?? "",
    title: input.title ?? "",
    description: input.description ?? "",
    order: typeof input.order === "number" ? input.order : 0,
    xp_reward: typeof input.xp_reward === "number" ? input.xp_reward : 10,
    is_published: Boolean(input.is_published),
  };
}

export function isValidLesson(lesson) {
  return Boolean(lesson?.course_id && lesson?.title);
}
