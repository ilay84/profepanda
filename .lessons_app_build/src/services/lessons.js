import { normalizeLesson } from "../entities/Lesson.js";

export async function listLessonsForCourse(courseId) {
  const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/lessons`, {
    credentials: "same-origin",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map(normalizeLesson);
}

export async function createLesson(draft = {}) {
  const res = await fetch("/api/lessons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(draft),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return normalizeLesson(data);
}

export async function updateLesson(lessonId, updates = {}) {
  const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return normalizeLesson(data);
}

export async function deleteLesson(lessonId) {
  const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  return res.ok;
}

export async function getLessonById(lessonId) {
  const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, {
    credentials: "same-origin",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return normalizeLesson(data);
}
