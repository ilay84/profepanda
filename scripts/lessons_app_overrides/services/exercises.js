import { normalizeExercise } from "../entities/Exercise.js";

export async function listExercisesForLesson(lessonId) {
  const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}/exercises`, {
    credentials: "same-origin",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.map(normalizeExercise);
}

export async function createExercise(draft = {}) {
  const res = await fetch("/api/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(draft),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return normalizeExercise(data);
}

export async function createExerciseWithError(draft = {}) {
  const res = await fetch("/api/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(draft),
  });
  if (!res.ok) {
    let error = res.statusText;
    try {
      const data = await res.json();
      if (data?.error) error = data.error;
    } catch {
      // ignore JSON parse errors
    }
    return { ok: false, status: res.status, error };
  }
  const data = await res.json();
  return { ok: true, status: res.status, data: normalizeExercise(data) };
}

export async function updateExercise(exerciseId, updates = {}) {
  const res = await fetch(`/api/exercises/${encodeURIComponent(exerciseId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return normalizeExercise(data);
}

export async function updateExerciseWithError(exerciseId, updates = {}) {
  const res = await fetch(`/api/exercises/${encodeURIComponent(exerciseId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    let error = res.statusText;
    try {
      const data = await res.json();
      if (data?.error) error = data.error;
    } catch {
      // ignore JSON parse errors
    }
    return { ok: false, status: res.status, error };
  }
  const data = await res.json();
  return { ok: true, status: res.status, data: normalizeExercise(data) };
}

export async function deleteExercise(exerciseId) {
  const res = await fetch(`/api/exercises/${encodeURIComponent(exerciseId)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  return res.ok;
}
