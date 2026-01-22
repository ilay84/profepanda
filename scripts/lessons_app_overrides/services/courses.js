import { normalizeCourse } from "../entities/Course.js";

async function apiGet(path) {
  const res = await fetch(path, { credentials: "same-origin" });
  if (!res.ok) return [];
  return await res.json();
}

export async function listPublishedCourses() {
  const courses = await apiGet("/api/courses");
  return courses.map(normalizeCourse);
}

export async function listMyCourses() {
  const courses = await apiGet("/api/courses?view=my");
  return courses.map(normalizeCourse);
}

export async function listAllCourses() {
  const courses = await apiGet("/api/courses?preview=1");
  return courses.map(normalizeCourse);
}

export async function createCourse(draft = {}) {
  const res = await fetch("/api/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(draft),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return normalizeCourse(data);
}

export async function setCoursePublished(courseId, isPublished) {
  const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ is_published: !!isPublished }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return normalizeCourse(data);
}

export async function updateCourse(courseId, updates = {}) {
  const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return normalizeCourse(data);
}

export async function deleteCourse(courseId) {
  const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  return res.ok;
}

export async function getCourseById(courseId) {
  const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}`, {
    credentials: "same-origin",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return normalizeCourse(data);
}
