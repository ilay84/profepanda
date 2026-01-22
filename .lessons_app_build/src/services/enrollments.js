async function apiRequest(path, options = {}) {
  const res = await fetch(path, { credentials: "same-origin", ...options });
  if (!res.ok) return null;
  return await res.json();
}

export async function enrollInCourse(courseId) {
  return apiRequest("/api/enrollments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ course_id: courseId }),
  });
}

export async function cancelEnrollment(courseId) {
  return apiRequest(`/api/enrollments/${encodeURIComponent(courseId)}`, {
    method: "DELETE",
  });
}
