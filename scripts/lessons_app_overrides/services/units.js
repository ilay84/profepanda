async function apiGet(path) {
  const res = await fetch(path, { credentials: "same-origin" });
  if (!res.ok) return [];
  return await res.json();
}

export async function listUnitsForCourse(courseId) {
  const units = await apiGet(`/api/units?course_id=${encodeURIComponent(courseId)}`);
  return Array.isArray(units) ? units : [];
}

export async function createUnit(draft = {}) {
  const res = await fetch("/api/units", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(draft),
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function updateUnit(unitId, updates = {}) {
  const res = await fetch(`/api/units/${encodeURIComponent(unitId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  return await res.json();
}

export async function deleteUnit(unitId) {
  const res = await fetch(`/api/units/${encodeURIComponent(unitId)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  return res.ok;
}
