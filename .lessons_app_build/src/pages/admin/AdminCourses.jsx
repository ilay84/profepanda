import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import visibleIcon from "../../assets/icons/lessons/visible.svg";
import hiddenIcon from "../../assets/icons/lessons/hidden.svg";
import deleteIcon from "../../assets/icons/lessons/delete.svg";
import editIcon from "../../assets/icons/lessons/edit.svg";
import addContentIcon from "../../assets/icons/lessons/add-content.svg";
import uploadIcon from "../../assets/icons/lessons/upload.svg";

import {
  createCourse,
  deleteCourse,
  listAllCourses,
  setCoursePublished,
  updateCourse,
} from "../../services/courses.js";

const LEVEL_OPTIONS = [
  { value: "all", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

function cn(...classes) {
  return classes.filter(Boolean).join(" \ ");
}

function formatKeywords(value) {
  if (Array.isArray(value)) return value.join(", ");
  return String(value || "");
}

function parseKeywords(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function CourseRow({
  course,
  index,
  total,
  onTogglePublished,
  onEdit,
  onDelete,
  onOpen,
  onMove,
}) {
  const levelLabel = (course.level || "").trim() || "All levels";
  const published = !!course.is_published;
  const imageUrl = course.image_url || course.imageUrl || "";

  const lessonCount =
    typeof course.total_lessons === "number"
      ? course.total_lessons
      : typeof course.lessonCount === "number"
      ? course.lessonCount
      : 0;

  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-4 rounded-2xl border bg-white px-4 py-4 shadow-sm transition",
        "border-slate-200 hover:border-slate-300 hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div
          className="hidden sm:flex h-10 w-6 items-center justify-center text-slate-300 cursor-grab"
          title="Drag to reorder (coming soon)"
        >
          <div className="grid grid-cols-2 gap-1">
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="h-1 w-1 rounded-full bg-slate-300" />
          </div>
        </div>

        <div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-orange-400 to-pink-400" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <p className="truncate text-base font-semibold text-slate-900">
              {course.title}
            </p>

            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {levelLabel}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
            <span>
              {course.source_language} - {course.target_language}
            </span>
            <span className="text-slate-300">|</span>
            <span>{lessonCount} lessons</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">

        <button
          type="button"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
            "border-transparent hover:border-slate-200 hover:bg-slate-50",
            "cursor-pointer"
          )}
          onClick={() => onTogglePublished(course.id)}
          aria-label={published ? "Set course hidden" : "Set course visible"}
          title={published ? "Visible to students" : "Hidden from students"}
        >
          <img
            src={published ? visibleIcon : hiddenIcon}
            alt=""
            className="h-5 w-5"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
            "border-transparent hover:border-slate-200 hover:bg-slate-50",
            "cursor-pointer"
          )}
          onClick={() => onEdit(course.id)}
          aria-label="Edit course"
          title="Edit"
        >
          <img src={editIcon} alt="" className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
            "border-transparent hover:border-slate-200 hover:bg-slate-50",
            "cursor-pointer"
          )}
          onClick={() => onDelete(course.id)}
          aria-label="Delete course"
          title="Delete"
        >
          <img
            src={deleteIcon}
            alt=""
            className="h-5 w-5"
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
            "border-transparent hover:border-slate-200 hover:bg-slate-50",
            "cursor-pointer"
          )}
          onClick={() => onOpen(course.id)}
          onContextMenu={(event) => event.preventDefault()}
          aria-label="Open course"
          title="Open"
        >
          <img
            src="/static/assets/icons/right-chevron.svg"
            alt=""
            aria-hidden="true"
            draggable="false"
            className="h-4 w-4"
            onContextMenu={(event) => event.preventDefault()}
          />
        </button>
      </div>
    </div>
  );
}

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [editorMode, setEditorMode] = useState("form");
  const [jsonValue, setJsonValue] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageFileRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();

  const loadCourses = async () => {
    setLoading(true);
    const data = await listAllCourses();
    setCourses(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    const handler = () => {
      openNewCourse();
    };
    window.addEventListener("ppx:new-course", handler);
    return () => window.removeEventListener("ppx:new-course", handler);
  }, []);


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;

    return courses.filter((c) => {
      const level = String(c.level || "").toLowerCase();
      const langs = `${c.source_language} ${c.target_language}`.toLowerCase();
      return (
        String(c.title || "").toLowerCase().includes(q) ||
        langs.includes(q) ||
        level.includes(q)
      );
    });
  }, [courses, query]);

  const sortedCourses = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }, [filtered]);

  const togglePublished = async (id) => {
    const current = courses.find((c) => c.id === id);
    if (!current) return;

    const updated = await setCoursePublished(id, !current.is_published);
    if (!updated) return;

    setCourses((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const openNewCourse = () => {
    setEditingCourse(null);
    const nextDraft = {
      title: "",
      description: "",
      keywords: "",
      source_language: "",
      target_language: "",
      level: "beginner",
      image_url: "",
      is_published: true,
    };
    setEditDraft(nextDraft);
    setEditorMode("form");
    setJsonValue(JSON.stringify(nextDraft, null, 2));
    setJsonError("");
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("newCourse") !== "1") return;
    params.delete("newCourse");
    navigate(
      {
        pathname: "/courses-admin/courses",
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true }
    );
    openNewCourse();
  }, [location.search]);

  const openEdit = (course) => {
    setEditingCourse(course);
    const nextDraft = {
      title: course.title ?? "",
      description: course.description ?? "",
      keywords: formatKeywords(course.keywords),
      source_language: course.source_language ?? "",
      target_language: course.target_language ?? "",
      level: course.level ?? "beginner",
      image_url: course.image_url || course.imageUrl || "",
      is_published: Boolean(course.is_published),
    };
    setEditDraft(nextDraft);
    setEditorMode("form");
    setJsonValue(JSON.stringify(nextDraft, null, 2));
    setJsonError("");
  };

  const closeEdit = () => {
    setEditingCourse(null);
    setEditDraft(null);
    setEditorMode("form");
    setJsonValue("");
    setJsonError("");
    setSaving(false);
  };

  const openJsonEditor = () => {
    if (!editDraft) return;
    setJsonValue(JSON.stringify(editDraft, null, 2));
    setJsonError("");
    setEditorMode("json");
  };

  const openFormEditor = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      setEditDraft((prev) => ({ ...prev, ...parsed }));
      setEditorMode("form");
      setJsonError("");
    } catch {
      setJsonError("Invalid JSON.");
    }
  };

  const uploadImageFile = async (file, context, applyUrl) => {
    if (!file) return;
    setUploadError("");
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (editingCourse?.id) {
        formData.append("course_id", editingCourse.id);
      }
      if (context) {
        formData.append("context", context);
      }
      const response = await fetch("/api/lessons-images", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }
      const nextUrl = data.url || "";
      if (nextUrl) {
        applyUrl(nextUrl);
      }
    } catch (err) {
      setUploadError(err?.message || "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEdit = (id) => {
    const current = courses.find((c) => c.id === id);
    if (!current) return;
    openEdit(current);
  };

  const handleDelete = async (id) => {
    const ok = confirm("Delete this course? This cannot be undone.");
    if (!ok) return;

    const success = await deleteCourse(id);
    if (!success) return;

    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const handleOpen = (id) => {
    const params = new URLSearchParams(location.search);
    params.set("courseId", id);
    const search = params.toString();
    navigate({
      pathname: "/courses-admin/lessons",
      search: search ? `?${search}` : "",
    });
  };

  const handleMove = async (id, direction) => {
    const list = sortedCourses;
    const index = list.findIndex((course) => course.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= list.length) return;

    const current = list[index];
    const target = list[targetIndex];
    const currentOrder = Number.isFinite(current.order) ? current.order : index;
    const targetOrder = Number.isFinite(target.order) ? target.order : targetIndex;
    const newCurrentOrder = currentOrder === targetOrder ? index : targetOrder;
    const newTargetOrder = currentOrder === targetOrder ? targetIndex : currentOrder;

    const [updatedCurrent, updatedTarget] = await Promise.all([
      updateCourse(current.id, { order: newCurrentOrder }),
      updateCourse(target.id, { order: newTargetOrder }),
    ]);

    if (!updatedCurrent || !updatedTarget) return;

    setCourses((prev) =>
      prev.map((course) => {
        if (course.id === updatedCurrent.id) return updatedCurrent;
        if (course.id === updatedTarget.id) return updatedTarget;
        return course;
      })
    );
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!editDraft) return;

    let rawDraft = editDraft;
    if (editorMode === "json") {
      try {
        rawDraft = JSON.parse(jsonValue);
      } catch {
        setJsonError("Invalid JSON.");
        return;
      }
    }

    const payload = {
      title: String(rawDraft.title || "").trim(),
      description: String(rawDraft.description || "").trim(),
      keywords: Array.isArray(rawDraft.keywords)
        ? rawDraft.keywords
        : parseKeywords(rawDraft.keywords),
      source_language: String(rawDraft.source_language || "").trim(),
      target_language: String(rawDraft.target_language || "").trim(),
      level: rawDraft.level || "beginner",
      image_url: String(rawDraft.image_url || "").trim(),
      is_published: Boolean(rawDraft.is_published),
    };

    if (!payload.title || !payload.source_language || !payload.target_language) {
      return;
    }

    setSaving(true);
    if (editingCourse) {
      const updated = await updateCourse(editingCourse.id, payload);
      if (updated) {
        setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        closeEdit();
        return;
      }
    } else {
      const created = await createCourse(payload);
      if (created) {
        setCourses((prev) => [...prev, created]);
        closeEdit();
        return;
      }
    }
    setSaving(false);
  };

  const canSave =
    editDraft &&
    editDraft.title.trim() &&
    editDraft.source_language.trim() &&
    editDraft.target_language.trim();

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <span aria-hidden="true">?</span>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses..."
          className={cn(
            "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-3 text-sm",
            "shadow-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          )}
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading courses.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedCourses.map((course, index) => (
            <CourseRow
              key={course.id}
              course={course}
              index={index}
              total={sortedCourses.length}
              onTogglePublished={togglePublished}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onOpen={handleOpen}
              onMove={handleMove}
            />
          ))}

          {sortedCourses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              No courses found.
            </div>
          ) : null}
        </div>
      )}

      {editDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={closeEdit}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Edit Course
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {editingCourse ? editingCourse.title : "New course"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {editorMode === "form" ? (
                  <button
                    type="button"
                    onClick={openJsonEditor}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    JSON Editor
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openFormEditor}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Form Editor
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeEdit}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label="Close"
                >
                  x
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {editorMode === "json" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-900">JSON</label>
                    <button
                      type="button"
                      onClick={() => setJsonValue(JSON.stringify(editDraft, null, 2))}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Refresh JSON
                    </button>
                  </div>
                  <textarea
                    rows={16}
                    value={jsonValue}
                    onChange={(e) => setJsonValue(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                  {jsonError ? (
                    <p className="text-xs text-red-600">{jsonError}</p>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">
                  Course title
                </label>
                <input
                  value={editDraft.title}
                  onChange={(e) =>
                    setEditDraft((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">
                  Description (optional)
                </label>
                <textarea
                  rows={3}
                  value={editDraft.description}
                  onChange={(e) =>
                    setEditDraft((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">
                  Keywords (optional)
                </label>
                <input
                  value={editDraft.keywords || ""}
                  onChange={(e) =>
                    setEditDraft((prev) => ({
                      ...prev,
                      keywords: e.target.value,
                    }))
                  }
                  placeholder="e.g. travel, greetings, airport"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <p className="text-xs text-slate-500">
                  Hidden tags used for future search. Separate with commas.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900">
                    Source language
                  </label>
                  <input
                    value={editDraft.source_language}
                    onChange={(e) =>
                      setEditDraft((prev) => ({
                        ...prev,
                        source_language: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900">
                    Target language
                  </label>
                  <input
                    value={editDraft.target_language}
                    onChange={(e) =>
                      setEditDraft((prev) => ({
                        ...prev,
                        target_language: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900">
                    Level
                  </label>
                  <select
                    value={editDraft.level}
                    onChange={(e) =>
                      setEditDraft((prev) => ({
                        ...prev,
                        level: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    {LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900">
                    Image URL (optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      value={editDraft.image_url}
                      onChange={(e) =>
                        setEditDraft((prev) => ({
                          ...prev,
                          image_url: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => imageFileRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <img src={uploadIcon} alt="" className="h-4 w-4" />
                      {uploadingImage ? "Uploading..." : "Upload"}
                    </button>
                    <input
                      ref={imageFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files && event.target.files[0];
                        if (file) {
                          uploadImageFile(file, "course-image", (url) =>
                            setEditDraft((prev) => ({
                              ...prev,
                              image_url: url,
                            }))
                          );
                        }
                        event.target.value = "";
                      }}
                    />
                  </div>
                  {uploadError ? (
                    <p className="text-xs text-rose-500">{uploadError}</p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Upload a course image or paste a URL.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Published
                  </p>
                  <p className="text-xs text-slate-500">
                    Make visible to students
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={Boolean(editDraft.is_published)}
                    onChange={(e) =>
                      setEditDraft((prev) => ({
                        ...prev,
                        is_published: e.target.checked,
                      }))
                    }
                  />
                  <span
                    className={cn(
                      "relative h-6 w-11 rounded-full transition",
                      editDraft.is_published ? "bg-slate-900" : "bg-slate-200"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition",
                        editDraft.is_published ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </span>
                </label>
              </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSave || saving}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm cursor-pointer",
                    canSave && !saving
                      ? "bg-[#475dd7] hover:brightness-95"
                      : "bg-slate-300"
                  )}
                >
                  {saving ? "Saving..." : "Save Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
