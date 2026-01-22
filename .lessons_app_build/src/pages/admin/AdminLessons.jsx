import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import visibleIcon from "../../assets/icons/lessons/visible.svg";
import hiddenIcon from "../../assets/icons/lessons/hidden.svg";
import deleteIcon from "../../assets/icons/lessons/delete.svg";
import editIcon from "../../assets/icons/lessons/edit.svg";
import addContentIcon from "../../assets/icons/lessons/add-content.svg";

import { listAllCourses } from "../../services/courses.js";
import {
  createUnit,
  deleteUnit,
  listUnitsForCourse,
  updateUnit,
} from "../../services/units.js";
import {
  createLesson,
  deleteLesson,
  listLessonsForCourse,
  updateLesson,
} from "../../services/lessons.js";

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

function LessonRow({
  lesson,
  index,
  onTogglePublished,
  onEdit,
  onDelete,
  onOpenContent,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragOver,
}) {
  const published = !!lesson.is_published;

  return (
    <div
      className={cn(
        "group relative flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white px-4 py-4 shadow-sm transition",
        "border-slate-200 hover:border-slate-300 hover:shadow-md",
        isDragOver && "border-indigo-400 ring-2 ring-indigo-200"
      )}
      onDragOver={(event) => onDragOver(event, lesson.id)}
      onDrop={(event) => onDrop(event, lesson.id)}
    >
      {isDragOver ? (
        <div className="absolute left-4 right-4 -top-1 h-1 rounded-full bg-indigo-400" />
      ) : null}
      <div className="flex items-start gap-4 min-w-0">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
            draggable
            onDragStart={(event) => onDragStart(event, lesson.id)}
            onDragEnd={onDragEnd}
            onDragOver={(event) => onDragOver(event, lesson.id)}
            onDrop={(event) => onDrop(event, lesson.id)}
          >
            <svg
              aria-hidden="true"
              width="10"
              height="16"
              viewBox="0 0 10 16"
              fill="none"
            >
              <circle cx="2" cy="2" r="1.5" fill="currentColor" />
              <circle cx="8" cy="2" r="1.5" fill="currentColor" />
              <circle cx="2" cy="8" r="1.5" fill="currentColor" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
              <circle cx="2" cy="14" r="1.5" fill="currentColor" />
              <circle cx="8" cy="14" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600">
            {index + 1}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <p className="truncate text-base font-semibold text-slate-900">
              {lesson.title}
            </p>
            <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              {lesson.xp_reward} XP
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-600 line-clamp-2">
            {lesson.description || "No description yet."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
            "border-transparent hover:border-slate-200 hover:bg-slate-50",
            "cursor-pointer"
          )}
          onClick={() => onOpenContent(lesson.id)}
          aria-label="Edit lesson content"
          title="Edit content"
        >
          <img src={addContentIcon} alt="" className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
            "border-transparent hover:border-slate-200 hover:bg-slate-50",
            "cursor-pointer"
          )}
          onClick={() => onTogglePublished(lesson.id)}
          aria-label={published ? "Set lesson hidden" : "Set lesson visible"}
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
          onClick={() => onEdit(lesson.id)}
          aria-label="Edit lesson"
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
          onClick={() => onDelete(lesson.id)}
          aria-label="Delete lesson"
          title="Delete"
        >
          <img
            src={deleteIcon}
            alt=""
            className="h-5 w-5"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}

export default function AdminLessons() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLesson, setEditingLesson] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editorMode, setEditorMode] = useState("form");
  const [jsonValue, setJsonValue] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragLessonId, setDragLessonId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [units, setUnits] = useState([]);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitDraft, setUnitDraft] = useState(null);
  const [unitSaving, setUnitSaving] = useState(false);
  const [openUnits, setOpenUnits] = useState({});
  const [dragUnitId, setDragUnitId] = useState(null);
  const [dragOverUnitId, setDragOverUnitId] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  const loadCourses = async () => {
    const data = await listAllCourses();
    setCourses(data);
  };

  const loadLessons = async (courseId) => {
    if (!courseId) {
      setLessons([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await listLessonsForCourse(courseId);
    setLessons(data);
    setLoading(false);
  };

  const loadUnits = async (courseId) => {
    if (!courseId) {
      setUnits([]);
      setOpenUnits({});
      return;
    }
    const data = await listUnitsForCourse(courseId);
    setUnits(data);
    setOpenUnits({});
  };

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (!courses.length) return;
    const params = new URLSearchParams(location.search);
    const queryCourseId = params.get("courseId");
    const next = queryCourseId && courses.some((c) => c.id === queryCourseId)
      ? queryCourseId
      : courses[0].id;
    if (next && next !== selectedCourseId) {
      setSelectedCourseId(next);
    }
  }, [location.search, courses, selectedCourseId]);

  useEffect(() => {
    loadLessons(selectedCourseId);
    loadUnits(selectedCourseId);
  }, [selectedCourseId]);

  const sortedLessons = useMemo(() => {
    return [...lessons].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }, [lessons]);

  const sortedUnits = useMemo(() => {
    return [...units].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }, [units]);
  const hasUnits = sortedUnits.length > 0;

  const lessonGroups = useMemo(() => {
    if (!sortedUnits.length) {
      return [];
    }
    const groups = sortedUnits.map((unit) => ({
      ...unit,
      lessons: [],
      isPseudo: false,
    }));
    const byId = new Map(groups.map((g) => [g.id, g]));
    const unassigned = [];

    sortedLessons.forEach((lesson) => {
      const unitId = String(lesson.unit_id || "");
      if (unitId && byId.has(unitId)) {
        byId.get(unitId).lessons.push(lesson);
      } else {
        unassigned.push(lesson);
      }
    });

    if (unassigned.length) {
      groups.push({
        id: "__none__",
        title: "Other lessons",
        description: "",
        lessons: unassigned,
        isPseudo: true,
      });
    }

    return groups;
  }, [sortedUnits, sortedLessons]);

  const persistOrder = async (items) => {
    const optimistic = items.map((lesson, idx) => ({ ...lesson, order: idx + 1 }));
    setLessons(optimistic);
    const updates = [];
    for (const lesson of optimistic) {
      const updated = await updateLesson(lesson.id, { order: lesson.order });
      if (!updated) {
        const refreshed = await listLessonsForCourse(selectedCourseId);
        setLessons(refreshed);
        return;
      }
      updates.push(updated);
    }
    setLessons(updates);
  };

  const persistUnitOrder = async (items) => {
    const optimistic = items.map((unit, idx) => ({ ...unit, order: idx + 1 }));
    setUnits(optimistic);
    const updates = [];
    for (const unit of optimistic) {
      const updated = await updateUnit(unit.id, { order: unit.order });
      if (!updated) {
        const refreshed = await listUnitsForCourse(selectedCourseId);
        setUnits(refreshed);
        return;
      }
      updates.push(updated);
    }
    setUnits(updates);
  };

  const openNewUnit = () => {
    if (!selectedCourseId) return;
    setEditingUnit(null);
    setUnitDraft({
      course_id: selectedCourseId,
      title: "",
      description: "",
    });
  };

  const openEditUnit = (unit) => {
    setEditingUnit(unit);
    setUnitDraft({
      course_id: unit.course_id,
      title: unit.title ?? "",
      description: unit.description ?? "",
    });
  };

  const closeUnitEditor = () => {
    setEditingUnit(null);
    setUnitDraft(null);
    setUnitSaving(false);
  };

  const handleUnitEdit = (id) => {
    const current = units.find((unit) => unit.id === id);
    if (!current) return;
    openEditUnit(current);
  };

  const handleUnitSave = async (event) => {
    event.preventDefault();
    if (!unitDraft) return;

    const payload = {
      course_id: unitDraft.course_id,
      title: unitDraft.title.trim(),
      description: unitDraft.description.trim(),
    };

    if (!payload.course_id || !payload.title) return;

    setUnitSaving(true);
    if (editingUnit) {
      const updated = await updateUnit(editingUnit.id, payload);
      if (updated) {
        setUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        closeUnitEditor();
        return;
      }
    } else {
      const created = await createUnit(payload);
      if (created) {
        setUnits((prev) => [...prev, created]);
        closeUnitEditor();
        return;
      }
    }
    setUnitSaving(false);
  };

  const handleUnitDelete = async (id) => {
    const ok = confirm("Delete this unit? Lessons will remain unassigned.");
    if (!ok) return;

    const success = await deleteUnit(id);
    if (!success) return;

    setUnits((prev) => prev.filter((unit) => unit.id !== id));
    setLessons((prev) =>
      prev.map((lesson) =>
        String(lesson.unit_id || "") === id ? { ...lesson, unit_id: "" } : lesson
      )
    );
  };

  const toggleUnitOpen = (unitId) => {
    setOpenUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const openNewLesson = () => {
    if (!selectedCourseId) return;
    const nextDraft = {
      course_id: selectedCourseId,
      unit_id: "",
      title: "",
      description: "",
      keywords: "",
      xp_reward: 10,
      is_published: true,
    };
    setEditingLesson(null);
    setDraft(nextDraft);
    setEditorMode("form");
    setJsonValue(JSON.stringify(nextDraft, null, 2));
    setJsonError("");
  };

  const openEditLesson = (lesson) => {
    const nextDraft = {
      course_id: lesson.course_id,
      unit_id: lesson.unit_id ?? "",
      title: lesson.title ?? "",
      description: lesson.description ?? "",
      keywords: formatKeywords(lesson.keywords),
      xp_reward: Number.isFinite(lesson.xp_reward) ? lesson.xp_reward : 10,
      is_published: Boolean(lesson.is_published),
    };
    setEditingLesson(lesson);
    setDraft(nextDraft);
    setEditorMode("form");
    setJsonValue(JSON.stringify(nextDraft, null, 2));
    setJsonError("");
  };

  const closeEditor = () => {
    setEditingLesson(null);
    setDraft(null);
    setEditorMode("form");
    setJsonValue("");
    setJsonError("");
    setSaving(false);
  };

  const openJsonEditor = () => {
    if (!draft) return;
    setJsonValue(JSON.stringify(draft, null, 2));
    setJsonError("");
    setEditorMode("json");
  };

  const openFormEditor = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      setDraft((prev) => ({ ...prev, ...parsed }));
      setEditorMode("form");
      setJsonError("");
    } catch {
      setJsonError("Invalid JSON.");
    }
  };

  const handleEdit = (id) => {
    const current = lessons.find((lesson) => lesson.id === id);
    if (!current) return;
    openEditLesson(current);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!draft) return;

    let rawDraft = draft;
    if (editorMode === "json") {
      try {
        rawDraft = JSON.parse(jsonValue);
      } catch {
        setJsonError("Invalid JSON.");
        return;
      }
    }

    const payload = {
      course_id: selectedCourseId || String(rawDraft.course_id || ""),
      unit_id: String(rawDraft.unit_id || ""),
      title: String(rawDraft.title || "").trim(),
      description: String(rawDraft.description || "").trim(),
      keywords: Array.isArray(rawDraft.keywords)
        ? rawDraft.keywords
        : parseKeywords(rawDraft.keywords),
      xp_reward: Number(rawDraft.xp_reward) || 0,
      is_published: Boolean(rawDraft.is_published),
    };

    if (!payload.course_id || !payload.title) return;

    setSaving(true);
    if (editingLesson) {
      const updated = await updateLesson(editingLesson.id, payload);
      if (updated) {
        setLessons((prev) =>
          prev.map((lesson) => (lesson.id === updated.id ? updated : lesson))
        );
        closeEditor();
        return;
      }
    } else {
      const created = await createLesson(payload);
      if (created) {
        setLessons((prev) => [...prev, created]);
        closeEditor();
        return;
      }
    }

    setSaving(false);
  };

  const handleDelete = async (id) => {
    const ok = confirm("Delete this lesson? This cannot be undone.");
    if (!ok) return;

    const success = await deleteLesson(id);
    if (!success) return;

    setLessons((prev) => prev.filter((lesson) => lesson.id !== id));
  };

  const handleTogglePublished = async (id) => {
    const current = lessons.find((lesson) => lesson.id === id);
    if (!current) return;

    const updated = await updateLesson(id, {
      is_published: !current.is_published,
    });
    if (!updated) return;

    setLessons((prev) => prev.map((lesson) => (lesson.id === id ? updated : lesson)));
  };

  const handleOpenContent = (lessonId) => {
    const params = new URLSearchParams(location.search);
    params.set("lessonId", lessonId);
    params.set("courseId", selectedCourseId);
    const search = params.toString();
    navigate({
      pathname: "/courses-admin/content",
      search: search ? `?${search}` : "",
    });
  };

  const onDragStart = (event, lessonId) => {
    const id = String(lessonId || "");
    setDragLessonId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const onDragEnd = () => {
    setDragLessonId(null);
    setDragOverId(null);
  };

  const onDragOver = (event, lessonId) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const id = String(lessonId || "");
    if (id !== dragOverId) {
      setDragOverId(id);
    }
  };

  const onDrop = async (event, lessonId) => {
    event.preventDefault();
    const sourceId =
      dragLessonId || event.dataTransfer.getData("text/plain") || null;
    setDragLessonId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === lessonId) return;

    const list = sortedLessons;
    const sourceIndex = list.findIndex(
      (lesson) => String(lesson.id || "") === String(sourceId)
    );
    const targetIndex = list.findIndex(
      (lesson) => String(lesson.id || "") === String(lessonId)
    );
    if (sourceIndex < 0 || targetIndex < 0) return;

    const sourceUnit = String(list[sourceIndex].unit_id || "");
    const targetUnit = String(list[targetIndex].unit_id || "");
    if (sourceUnit !== targetUnit) return;

    const next = [...list];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    await persistOrder(next);
  };

  const onUnitDragStart = (event, unitId) => {
    const id = String(unitId || "");
    setDragUnitId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const onUnitDragEnd = () => {
    setDragUnitId(null);
    setDragOverUnitId(null);
  };

  const onUnitDragOver = (event, unitId) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const id = String(unitId || "");
    if (id !== dragOverUnitId) {
      setDragOverUnitId(id);
    }
  };

  const onUnitDrop = async (event, unitId) => {
    event.preventDefault();
    const sourceId =
      dragUnitId || event.dataTransfer.getData("text/plain") || null;
    setDragUnitId(null);
    setDragOverUnitId(null);
    if (!sourceId || sourceId === unitId) return;

    const list = sortedUnits;
    const sourceIndex = list.findIndex(
      (unit) => String(unit.id || "") === String(sourceId)
    );
    const targetIndex = list.findIndex(
      (unit) => String(unit.id || "") === String(unitId)
    );
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...list];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    await persistUnitOrder(next);
  };

  const handleCourseChange = (event) => {
    const nextId = event.target.value;
    setSelectedCourseId(nextId);
    const params = new URLSearchParams(location.search);
    params.set("courseId", nextId);
    const search = params.toString();
    navigate({
      pathname: location.pathname,
      search: search ? `?${search}` : "",
    }, { replace: true });
  };

  const canSave = draft && draft.title.trim();
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/courses-admin/courses"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            <span aria-hidden="true">&lt;</span> Back to Courses
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Lessons</h1>
          <p className="text-sm text-slate-500">
            Create, edit, and reorder lessons for a course.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openNewUnit}
            disabled={!selectedCourseId}
            className={cn(
              "inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold border shadow-sm",
              selectedCourseId
                ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                : "border-slate-200 text-slate-300"
            )}
          >
            + New Unit
          </button>
          <button
            type="button"
            onClick={openNewLesson}
            disabled={!selectedCourseId}
            className={cn(
              "inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm",
              selectedCourseId ? "bg-[#475dd7] hover:brightness-95" : "bg-slate-300"
            )}
          >
            + New Lesson
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-slate-700">
          Course
        </label>
        <select
          value={selectedCourseId}
          onChange={handleCourseChange}
          className="min-w-[240px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          {courses.length === 0 ? (
            <option value="">No courses yet</option>
          ) : null}
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading lessons.
        </div>
      ) : (
        <div className="space-y-4">
          {hasUnits ? (
            <>
              {lessonGroups.map((group) => {
                const isOpen = !!openUnits[group.id];
                const chevronClass = isOpen ? "rotate-180" : "rotate-0";
                const canDrag = !group.isPseudo;
                return (
                  <div
                    key={group.id}
                    className={cn(
                      "rounded-2xl border bg-white shadow-sm",
                      dragOverUnitId === group.id && "border-indigo-400 ring-2 ring-indigo-200",
                      "border-slate-200"
                    )}
                    onDragOver={(event) => canDrag && onUnitDragOver(event, group.id)}
                    onDrop={(event) => canDrag && onUnitDrop(event, group.id)}
                  >
                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {canDrag ? (
                          <div
                            className="flex h-9 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-grab active:cursor-grabbing"
                            title="Drag to reorder"
                            draggable
                            onDragStart={(event) => onUnitDragStart(event, group.id)}
                            onDragEnd={onUnitDragEnd}
                          >
                            <svg aria-hidden="true" width="10" height="16" viewBox="0 0 10 16" fill="none">
                              <circle cx="2" cy="2" r="1.5" fill="currentColor" />
                              <circle cx="8" cy="2" r="1.5" fill="currentColor" />
                              <circle cx="2" cy="8" r="1.5" fill="currentColor" />
                              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                              <circle cx="2" cy="14" r="1.5" fill="currentColor" />
                              <circle cx="8" cy="14" r="1.5" fill="currentColor" />
                            </svg>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => toggleUnitOpen(group.id)}
                          className="flex items-center gap-2 text-left cursor-pointer"
                        >
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <svg
                              className={`h-4 w-4 transition-transform ${chevronClass}`}
                              viewBox="0 0 20 20"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M5 12l5-5 5 5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {group.title}
                            </div>
                            {group.description ? (
                              <div className="text-xs text-slate-500 whitespace-normal break-words">
                                {group.description}
                              </div>
                            ) : null}
                          </div>
                          <span className="text-xs text-slate-400">
                            {group.lessons.length} lessons
                          </span>
                        </button>
                      </div>

                      {!group.isPseudo ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            className={cn(
                              "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
                              "border-transparent hover:border-slate-200 hover:bg-slate-50",
                              "cursor-pointer"
                            )}
                            onClick={() => handleUnitEdit(group.id)}
                            aria-label="Edit unit"
                            title="Edit unit"
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
                            onClick={() => handleUnitDelete(group.id)}
                            aria-label="Delete unit"
                            title="Delete unit"
                          >
                            <img src={deleteIcon} alt="" className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {isOpen ? (
                      <div className="space-y-3 px-4 pb-4">
                        {group.lessons.length === 0 ? (
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
                            No lessons yet.
                          </div>
                        ) : (
                          group.lessons.map((lesson, idx) => (
                            <LessonRow
                              key={lesson.id}
                              lesson={lesson}
                              index={idx}
                              onTogglePublished={handleTogglePublished}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              onOpenContent={handleOpenContent}
                              onDragStart={onDragStart}
                              onDragOver={onDragOver}
                              onDragEnd={onDragEnd}
                              onDrop={onDrop}
                              isDragOver={dragOverId === lesson.id}
                            />
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </>
          ) : (
            <div className="space-y-3">
              {sortedLessons.map((lesson, idx) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  index={idx}
                  onTogglePublished={handleTogglePublished}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onOpenContent={handleOpenContent}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragEnd={onDragEnd}
                  onDrop={onDrop}
                  isDragOver={dragOverId === lesson.id}
                />
              ))}

              {sortedLessons.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                  {selectedCourseId
                    ? "No lessons yet. Click New Lesson to add one."
                    : "Select a course to view lessons."}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {draft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={closeEditor}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {editingLesson ? "Edit Lesson" : "New Lesson"}
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedCourse ? selectedCourse.title : "Lesson details"}
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
                  onClick={closeEditor}
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
                      onClick={() => setJsonValue(JSON.stringify(draft, null, 2))}
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
                      Lesson title
                    </label>
                    <input
                      value={draft.title}
                      onChange={(e) =>
                        setDraft((prev) => ({
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
                      value={draft.description}
                      onChange={(e) =>
                        setDraft((prev) => ({
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
                      value={draft.keywords || ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          keywords: e.target.value,
                        }))
                      }
                      placeholder="e.g. greetings, introductions, travel"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                    <p className="text-xs text-slate-500">
                      Hidden tags used for future search. Separate with commas.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">
                      Unit (optional)
                    </label>
                    <select
                      value={draft.unit_id || ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          unit_id: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="">No unit</option>
                      {sortedUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">
                      XP reward
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={draft.xp_reward}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          xp_reward: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
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
                        checked={Boolean(draft.is_published)}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            is_published: e.target.checked,
                          }))
                        }
                      />
                      <span
                        className={cn(
                          "relative h-6 w-11 rounded-full transition",
                          draft.is_published ? "bg-slate-900" : "bg-slate-200"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition",
                            draft.is_published ? "translate-x-5" : "translate-x-0"
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
                  onClick={closeEditor}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSave || saving}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm",
                    canSave && !saving
                      ? "bg-[#475dd7] hover:brightness-95"
                      : "bg-slate-300"
                  )}
                >
                  {saving ? "Saving..." : "Save Lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {unitDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={closeUnitEditor}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {editingUnit ? "Edit Unit" : "New Unit"}
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedCourse ? selectedCourse.title : "Unit details"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeUnitEditor}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Close"
              >
                x
              </button>
            </div>

            <form onSubmit={handleUnitSave} className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">
                  Unit title
                </label>
                <input
                  value={unitDraft.title}
                  onChange={(e) =>
                    setUnitDraft((prev) => ({
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
                  value={unitDraft.description}
                  onChange={(e) =>
                    setUnitDraft((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeUnitEditor}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!unitDraft.title.trim() || unitSaving}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm",
                    unitDraft.title.trim() && !unitSaving
                      ? "bg-[#475dd7] hover:brightness-95"
                      : "bg-slate-300"
                  )}
                >
                  {unitSaving ? "Saving..." : "Save Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
