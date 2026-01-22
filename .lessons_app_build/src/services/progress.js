import { normalizeUserProgress } from "../entities/UserProgress.js";

export async function listProgressForUser(userEmail) {
  const emailParam = encodeURIComponent(userEmail || "");
  const res = await fetch(`/api/progress/user?email=${emailParam}`, {
    credentials: "same-origin",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map(normalizeUserProgress);
}

export async function markLessonComplete({ userEmail, courseId, lessonId, xpReward = 0 }) {
  const res = await fetch("/api/progress/lesson-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      userEmail,
      courseId,
      lessonId,
      xpReward,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return normalizeUserProgress(data);
}
