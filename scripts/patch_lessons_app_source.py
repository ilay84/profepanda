from __future__ import annotations

import re
from pathlib import Path


def _replace_block(text: str, pattern: str, replacement: str) -> str:
    if re.search(pattern, text, flags=re.DOTALL):
        return re.sub(pattern, replacement, text, flags=re.DOTALL)
    return text


def patch_layout(path: Path) -> None:
    text = path.read_text(encoding="utf-8")

    text = text.replace(
        'import React, { useEffect, useState } from "react";',
        'import React, { useEffect, useRef, useState } from "react";',
    )

    student_nav = """const studentNavItems = [
    { name: t("Courses Home", "Inicio de cursos"), page: "Catalog", icon: BookOpen },
    { name: t("My Courses", "Mis cursos"), page: "MyCourses", icon: BookOpen },
  ];"""
    text = _replace_block(
        text,
        r"const studentNavItems = \[.*?\];",
        student_nav,
    )

    text = text.replace(
        "const isActive = location.pathname === url;",
        """const isActive = (() => {
            const basePath = url.split("?")[0];
            if (location.pathname !== basePath) return false;
            const currentParams = new URLSearchParams(location.search);
            const targetParams = new URLSearchParams(url.split("?")[1] || "");
            currentParams.delete("lang");
            targetParams.delete("lang");
            const currentView = currentParams.get("view") || "";
            const targetView = targetParams.get("view") || "";
            return currentView === targetView;
          })();""",
    )

    text = text.replace(
        "const url = createPageUrl(item.page);",
        "const url = linkWithLang(createPageUrl(item.page));",
    )

    text = text.replace(
        "const location = useLocation();",
        """const location = useLocation();

  const lang = new URLSearchParams(location.search).get("lang") === "es" ? "es" : "en";
  const t = (en, es) => (lang === "es" ? es : en);
  const linkWithLang = (url) => {
    const param = `lang=${lang}`;
    return url.includes("?") ? `${url}&${param}` : `${url}?${param}`;
  };
  const langHref = (nextLang) => {
    const params = new URLSearchParams(location.search);
    params.set("lang", nextLang);
    const query = params.toString();
    return query ? `${location.pathname}?${query}` : location.pathname;
  };""",
    )

    text = text.replace(
        "const [streak, setStreak] = useState(0);",
        "const [streak, setStreak] = useState(0);\n  const menuRef = useRef(null);\n  const langRef = useRef(null);",
    )
    text = text.replace(
        "  const langHref = (nextLang) => {\n    const params = new URLSearchParams(location.search);\n    params.set(\"lang\", nextLang);\n    const query = params.toString();\n    return query ? `${location.pathname}?${query}` : location.pathname;\n  };",
        "  const langHref = (nextLang) => {\n    const params = new URLSearchParams(location.search);\n    params.set(\"lang\", nextLang);\n    const query = params.toString();\n    return query ? `${location.pathname}?${query}` : location.pathname;\n  };\n  const loginHref = `/auth/login?next=${encodeURIComponent(location.pathname + location.search)}`;",
    )

    header_block = """<header className="fixed top-0 left-0 right-0 z-50">
      <nav id="ppx-public-bar" role="navigation" aria-label="Public">
        <div className="ppx-lessons-topbar-inner">
          <a href="/" className="ppx-lessons-brand" aria-label="ProfePanda Home">
            <img src="/static/assets/logo/header-logo.svg" alt="ProfePanda" />
          </a>

          <div className="ppx-lessons-topbar-actions">
            {!user && (
              <a
                className="ppx-lessons-login"
                href={loginHref}
                title={t("Sign in or register for free", "Ingresar o crear cuenta gratis")}
              >
                <img src="/static/assets/icons/login.svg" alt="" aria-hidden="true" />
                {t("Sign in", "Ingresar")}
              </a>
            )}

            {user && (
              <button
                type="button"
                className="ppx-lessons-login"
                title={t("Log out", "Salir")}
                onClick={() => auth.logout()}
              >
                <img src="/static/assets/icons/logout.svg" alt="" aria-hidden="true" />
                {t("Log out", "Salir")}
              </button>
            )}

            <details className="ppx-lessons-menu" ref={menuRef}>
              <summary aria-label="Open menu">
                <span aria-hidden="true"></span>
                <span>Menu</span>
              </summary>
              <div className="ppx-lessons-menu-panel" role="menu" aria-label="Navigation">
                <ul data-menu="primary">
                  <li>
                    <a href={linkWithLang("/")} role="menuitem">
                      <img src="/static/assets/icons/homepage.svg" alt="" aria-hidden="true" style={{ width: 18, height: 18 }} />
                      <span>{t("Home", "Inicio")}</span>
                    </a>
                  </li>
                  <li>
                    <a href={linkWithLang("/courses")} role="menuitem">
                      <img src="/static/assets/icons/courses.svg" alt="" aria-hidden="true" style={{ width: 18, height: 18 }} />
                      <span>{t("Courses", "Cursos")}</span>
                    </a>
                  </li>
                  <li>
                    <a href={linkWithLang("/glossary/")} role="menuitem">
                      <img src="/static/assets/icons/glossariespage.svg" alt="" aria-hidden="true" style={{ width: 18, height: 18 }} />
                      <span>{t("Glossary", "Glosario")}</span>
                    </a>
                  </li>
                </ul>
              </div>
            </details>

            <details className="ppx-lessons-lang" ref={langRef}>
              <summary aria-label="Change language">
                <span aria-hidden="true"></span>
                <span>{lang === "es" ? "Espanol" : "English"}</span>
              </summary>
              <div className="ppx-lessons-lang-panel" role="menu" aria-label="Languages">
                <ul>
                  <li>
                    <a href={langHref("en")} role="menuitem" aria-current={lang === "en" ? "true" : "false"}>
                      <span>English</span><span aria-hidden="true"></span>
                    </a>
                  </li>
                  <li>
                    <a href={langHref("es")} role="menuitem" aria-current={lang === "es" ? "true" : "false"}>
                      <span>Espanol</span><span aria-hidden="true"></span>
                    </a>
                  </li>
                </ul>
              </div>
            </details>
          </div>
        </div>
      </nav>

      <div className="ppx-lessons-header">
        <div className="flex items-center justify-between h-16 px-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <Link to={linkWithLang(createPageUrl("Catalog"))} className="flex items-center">
              <span className="ppx-lessons-title">{t("Courses", "Cursos")}</span>
            </Link>
          </div>

          {user && !isAdminPage && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-full">
                <Flame className="h-4 w-4" />
                <span className="text-sm font-semibold">{streak}</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-full">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-semibold">{totalXp} XP</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to={linkWithLang(createPageUrl(isAdminPage ? "Catalog" : "AdminDashboard"))}>
                <Button variant="outline" size="sm" className="text-xs">
                  {isAdminPage ? "Student View" : "Admin Panel"}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>"""

    text = _replace_block(
        text,
        r'<header className="fixed.*?</header>',
        header_block,
    )

    text = text.replace(
        "  useEffect(() => {\n    loadUser();\n  }, [location.pathname]);",
        """  useEffect(() => {\n    loadUser();\n  }, [location.pathname]);\n\n  useEffect(() => {\n    function onDocClick(event) {\n      if (menuRef.current && !menuRef.current.contains(event.target)) {\n        menuRef.current.removeAttribute(\"open\");\n      }\n      if (langRef.current && !langRef.current.contains(event.target)) {\n        langRef.current.removeAttribute(\"open\");\n      }\n    }\n\n    document.addEventListener(\"click\", onDocClick);\n    return () => document.removeEventListener(\"click\", onDocClick);\n  }, []);""",
    )

    text = text.replace("top-16", "top-[112px]")
    text = text.replace("pt-16", "pt-[112px]")

    path.write_text(text, encoding="utf-8")


def patch_utils(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = text.replace('Home: "/"', 'Home: "/courses"')
    if "Catalog" not in text:
        text = text.replace(
            "const routes = {",
            "const routes = {\n    Catalog: \"/courses\",",
        )
    text = text.replace('MyCourses: "/courses"', 'MyCourses: "/courses?view=my"')
    path.write_text(text, encoding="utf-8")


def patch_exercise_entity(path: Path) -> None:
    template_path = (
        Path(__file__).resolve().parent / "lessons_app_overrides" / "entities" / "Exercise.js"
    )
    if template_path.exists():
        path.write_text(template_path.read_text(encoding="utf-8"), encoding="utf-8")
        return

    text = path.read_text(encoding="utf-8")

    if "option_feedback" not in text:
        text = text.replace(
            "    options: normalizeStringArray(input.options),\n",
            "    options: normalizeStringArray(input.options),\n\n    option_feedback: normalizeStringArray(input.option_feedback),\n",
        )

    if "dialogue" not in text:
        text = text.replace(
            '  "explanation",\r\n',
            '  "explanation",\r\n  "dialogue",\r\n',
        )
        text = text.replace(
            '  "explanation",\n',
            '  "explanation",\n  "dialogue",\n',
        )
    if '"example_sentence"' not in text:
        if '  "dialogue",\r\n' in text:
            text = text.replace(
                '  "dialogue",\r\n',
                '  "dialogue",\r\n  "example_sentence",\r\n',
            )
        elif '  "dialogue",\n' in text:
            text = text.replace(
                '  "dialogue",\n',
                '  "dialogue",\n  "example_sentence",\n',
            )
        else:
            text = text.replace(
                '  "explanation",\r\n',
                '  "explanation",\r\n  "example_sentence",\r\n',
            )
            text = text.replace(
                '  "explanation",\n',
                '  "explanation",\n  "example_sentence",\n',
            )
    if '"word_order"' not in text:
        if '  "example_sentence",\r\n' in text:
            text = text.replace(
                '  "example_sentence",\r\n',
                '  "example_sentence",\r\n  "word_order",\r\n',
            )
        elif '  "example_sentence",\n' in text:
            text = text.replace(
                '  "example_sentence",\n',
                '  "example_sentence",\n  "word_order",\n',
            )
        else:
            text = text.replace(
                '  "dialogue",\r\n',
                '  "dialogue",\r\n  "word_order",\r\n',
            )
            text = text.replace(
                '  "dialogue",\n',
                '  "dialogue",\n  "word_order",\n',
            )
    if '"dictation"' not in text:
        if '  "word_order",\r\n' in text:
            text = text.replace(
                '  "word_order",\r\n',
                '  "word_order",\r\n  "dictation",\r\n',
            )
        elif '  "word_order",\n' in text:
            text = text.replace(
                '  "word_order",\n',
                '  "word_order",\n  "dictation",\n',
            )
        else:
            text = text.replace(
                '  "example_sentence",\r\n',
                '  "example_sentence",\r\n  "dictation",\r\n',
            )
            text = text.replace(
                '  "example_sentence",\n',
                '  "example_sentence",\n  "dictation",\n',
            )

    if "normalizeDialogSpeakers" not in text:
        text = text.replace(
            "function normalizeMatchingPairs(value) {\n",
            "function normalizeDialogSpeakers(value) {\n"
            "  if (!Array.isArray(value)) return [];\n"
            "  return value\n"
            "    .map((s) => ({\n"
            "      name: String(s?.name ?? \"\"),\n"
            "      avatar_url: String(s?.avatar_url ?? \"\"),\n"
            "    }))\n"
            "    .filter((s) => s.name.trim().length > 0);\n"
            "}\n\n"
            "function normalizeDialogLines(value) {\n"
            "  if (!Array.isArray(value)) return [];\n"
            "  return value\n"
            "    .map((l) => ({\n"
            "      speaker_index: typeof l?.speaker_index === \"number\" ? l.speaker_index : 0,\n"
            "      text: String(l?.text ?? \"\"),\n"
            "      translation: String(l?.translation ?? \"\"),\n"
            "      audio_url: String(l?.audio_url ?? \"\"),\n"
            "    }))\n"
            "    .filter((l) => l.text.trim().length > 0);\n"
            "}\n\n"
            "function normalizeMatchingPairs(value) {\n",
        )

    if "dialog_speakers" not in text:
        text = text.replace(
            "    explanation_content: input.explanation_content ?? \"\",\n    example_sentences: normalizeExampleSentences(input.example_sentences),\n\n    matching_pairs: normalizeMatchingPairs(input.matching_pairs),\n",
            "    explanation_content: input.explanation_content ?? \"\",\n    example_sentences: normalizeExampleSentences(input.example_sentences),\n\n    sentence_text: input.sentence_text ?? \"\",\n    sentence_translation: input.sentence_translation ?? \"\",\n\n    dialog_speakers: normalizeDialogSpeakers(input.dialog_speakers),\n    dialog_lines: normalizeDialogLines(input.dialog_lines),\n\n    matching_pairs: normalizeMatchingPairs(input.matching_pairs),\n",
        )
    if "word_order_words" not in text:
        text = text.replace(
            "    matching_pairs: normalizeMatchingPairs(input.matching_pairs),\n",
            "    matching_pairs: normalizeMatchingPairs(input.matching_pairs),\n\n    word_order_words: normalizeStringArray(input.word_order_words),\n    word_order_decoys: normalizeStringArray(input.word_order_decoys),\n",
        )

    path.write_text(text, encoding="utf-8")


def patch_admin_courses(path: Path) -> None:
    admin_courses = """import { useEffect, useMemo, useRef, useState } from "react";
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
"""

    path.write_text(admin_courses, encoding="utf-8")




def patch_admin_lessons(path: Path) -> None:
    template_path = (
        Path(__file__).resolve().parent / "lessons_app_overrides" / "AdminLessons.jsx"
    )
    if template_path.exists():
        path.write_text(template_path.read_text(encoding="utf-8"), encoding="utf-8")
        return

    admin_lessons = """import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import visibleIcon from "../../assets/icons/lessons/visible.svg";
import hiddenIcon from "../../assets/icons/lessons/hidden.svg";
import deleteIcon from "../../assets/icons/lessons/delete.svg";
import editIcon from "../../assets/icons/lessons/edit.svg";

import { listAllCourses } from "../../services/courses.js";
import {
  createLesson,
  deleteLesson,
  listLessonsForCourse,
  updateLesson,
} from "../../services/lessons.js";

function cn(...classes) {
  return classes.filter(Boolean).join(" \ ");
}

function LessonRow({
  lesson,
  index,
  total,
  onTogglePublished,
  onEdit,
  onDelete,
  onMove,
  onOpenContent,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}) {
  const published = !!lesson.is_published;

  return (
    <div
      className={cn(
        "group flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white px-4 py-4 shadow-sm transition",
        "border-slate-200 hover:border-slate-300 hover:shadow-md",
        isDragOver && "border-indigo-400 ring-2 ring-indigo-200"
      )}
      draggable
      onDragStart={(event) => onDragStart(event, lesson.id)}
      onDragOver={(event) => onDragOver(event, lesson.id)}
      onDrop={(event) => onDrop(event, lesson.id)}
    >
      <div className="flex items-start gap-4 min-w-0">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600 cursor-grab"
          title="Drag to reorder"
        >
          {index + 1}
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
          onClick={() => onMove(lesson.id, -1)}
          disabled={index == 0}
          aria-label="Move lesson up"
          title="Move up"
        >
          <span className="text-sm text-slate-600">^</span>
        </button>

        <button
          type="button"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
            "border-transparent hover:border-slate-200 hover:bg-slate-50",
            "cursor-pointer"
          )}
          onClick={() => onMove(lesson.id, 1)}
          disabled={index == total - 1}
          aria-label="Move lesson down"
          title="Move down"
        >
          <span className="text-sm text-slate-600">v</span>
        </button>

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
  const [saving, setSaving] = useState(false);
  const [dragLessonId, setDragLessonId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

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
  }, [selectedCourseId]);

  const sortedLessons = useMemo(() => {
    return [...lessons].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }, [lessons]);

  const persistOrder = async (items) => {
    const updates = await Promise.all(
      items.map((lesson, idx) => updateLesson(lesson.id, { order: idx + 1 }))
    );
    const ok = updates.every(Boolean);
    if (!ok) return;
    setLessons(updates);
  };

  const openNewLesson = () => {
    if (!selectedCourseId) return;
    setEditingLesson(null);
    setDraft({
      course_id: selectedCourseId,
      title: "",
      description: "",
      xp_reward: 10,
      is_published: true,
    });
  };

  const openEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setDraft({
      course_id: lesson.course_id,
      title: lesson.title ?? "",
      description: lesson.description ?? "",
      xp_reward: Number.isFinite(lesson.xp_reward) ? lesson.xp_reward : 10,
      is_published: Boolean(lesson.is_published),
    });
  };

  const closeEditor = () => {
    setEditingLesson(null);
    setDraft(null);
    setSaving(false);
  };

  const handleEdit = (id) => {
    const current = lessons.find((lesson) => lesson.id === id);
    if (!current) return;
    openEditLesson(current);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!draft) return;

    const payload = {
      course_id: draft.course_id,
      title: draft.title.trim(),
      description: draft.description.trim(),
      xp_reward: Number(draft.xp_reward) || 0,
      is_published: Boolean(draft.is_published),
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

  const handleMove = async (id, direction) => {
    const list = sortedLessons;
    const index = list.findIndex((lesson) => lesson.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= list.length) return;

    const next = [...list];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    await persistOrder(next);
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
    setDragLessonId(lessonId);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (event, lessonId) => {
    event.preventDefault();
    if (lessonId !== dragOverId) {
      setDragOverId(lessonId);
    }
  };

  const onDrop = async (event, lessonId) => {
    event.preventDefault();
    const sourceId = dragLessonId;
    setDragLessonId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === lessonId) return;

    const list = sortedLessons;
    const sourceIndex = list.findIndex((lesson) => lesson.id === sourceId);
    const targetIndex = list.findIndex((lesson) => lesson.id === lessonId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...list];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    await persistOrder(next);
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
          <h1 className="text-2xl font-bold text-slate-800">Lessons</h1>
          <p className="text-sm text-slate-500">
            Create, edit, and reorder lessons for a course.
          </p>
        </div>

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
        <div className="space-y-3">
          {sortedLessons.map((lesson, idx) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              index={idx}
              total={sortedLessons.length}
              onTogglePublished={handleTogglePublished}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMove={handleMove}
              onOpenContent={handleOpenContent}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
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
              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Close"
              >
                x
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
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
    </div>
  );
}
"""

    path.write_text(admin_lessons, encoding="utf-8")



def patch_admin_content(path: Path) -> None:
    template_path = (
        Path(__file__).resolve().parent / "lessons_app_overrides" / "AdminContent.jsx"
    )
    if template_path.exists():
        path.write_text(template_path.read_text(encoding="utf-8"), encoding="utf-8")
        return

    admin_content = """import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import deleteIcon from "../../assets/icons/lessons/delete.svg";
import editIcon from "../../assets/icons/lessons/edit.svg";

import { listAllCourses } from "../../services/courses.js";
import { listLessonsForCourse } from "../../services/lessons.js";
import {
  createExercise,
  deleteExercise,
  listExercisesForLesson,
  updateExercise,
} from "../../services/exercises.js";

const EXERCISE_TYPES = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "translation", label: "Translation" },
  { value: "matching", label: "Matching" },
  { value: "explanation", label: "Explanation" },
];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminContent() {
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingExercise, setEditingExercise] = useState(null);
  const [draft, setDraft] = useState(null);
  const [jsonValue, setJsonValue] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragExerciseId, setDragExerciseId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const data = await listAllCourses();
      setCourses(data);
    })();
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
    if (!selectedCourseId) return;
    (async () => {
      const data = await listLessonsForCourse(selectedCourseId);
      setLessons(data);
    })();
  }, [selectedCourseId]);

  useEffect(() => {
    if (!lessons.length) return;
    const params = new URLSearchParams(location.search);
    const queryLessonId = params.get("lessonId");
    const next = queryLessonId && lessons.some((l) => l.id === queryLessonId)
      ? queryLessonId
      : lessons[0].id;
    if (next && next !== selectedLessonId) {
      setSelectedLessonId(next);
    }
  }, [location.search, lessons, selectedLessonId]);

  useEffect(() => {
    if (!selectedLessonId) return;
    (async () => {
      setLoading(true);
      const data = await listExercisesForLesson(selectedLessonId);
      setExercises(data);
      setLoading(false);
    })();
  }, [selectedLessonId]);

  const sortedExercises = useMemo(() => {
    return [...exercises].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }, [exercises]);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId);

  const openEditor = (exercise) => {
    const nextDraft = exercise
      ? {
          ...exercise,
          options: exercise.options || [],
          option_feedback: exercise.option_feedback || [],
        }
      : {
          lesson_id: selectedLessonId,
          type: "multiple_choice",
          question: "",
          options: ["Option 1", "Option 2"],
          option_feedback: ["", ""],
          correct_answer: "",
          hint: "",
          matching_pairs: [{ left: "", right: "" }],
        };
    setEditingExercise(exercise || null);
    setDraft(nextDraft);
    setJsonValue(JSON.stringify(nextDraft, null, 2));
    setJsonError("");
  };

  const closeEditor = () => {
    setEditingExercise(null);
    setDraft(null);
    setJsonValue("");
    setJsonError("");
    setSaving(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!draft) return;

    let payload = null;
    try {
      payload = JSON.parse(jsonValue);
    } catch (err) {
      setJsonError("Invalid JSON.");
      return;
    }
    if (!payload.lesson_id || !payload.type) return;

    setSaving(true);
    let updated = null;
    if (editingExercise) {
      updated = await updateExercise(editingExercise.id, payload);
      if (updated) {
        setExercises((prev) =>
          prev.map((ex) => (ex.id === updated.id ? updated : ex))
        );
        closeEditor();
        return;
      }
    } else {
      updated = await createExercise(payload);
      if (updated) {
        setExercises((prev) => [...prev, updated]);
        closeEditor();
        return;
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    const ok = confirm("Delete this content? This cannot be undone.");
    if (!ok) return;
    const success = await deleteExercise(id);
    if (!success) return;
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  const handleMove = async (id, direction) => {
    const list = sortedExercises;
    const index = list.findIndex((ex) => ex.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= list.length) return;

    const next = [...list];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    const updates = await Promise.all(
      next.map((ex, idx) => updateExercise(ex.id, { order: idx + 1 }))
    );
    const ok = updates.every(Boolean);
    if (!ok) return;
    setExercises(updates);
  };

  const onDragStart = (event, exerciseId) => {
    setDragExerciseId(exerciseId);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (event, exerciseId) => {
    event.preventDefault();
    if (exerciseId !== dragOverId) {
      setDragOverId(exerciseId);
    }
  };

  const onDrop = async (event, exerciseId) => {
    event.preventDefault();
    const sourceId = dragExerciseId;
    setDragExerciseId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === exerciseId) return;

    const list = sortedExercises;
    const sourceIndex = list.findIndex((ex) => ex.id === sourceId);
    const targetIndex = list.findIndex((ex) => ex.id === exerciseId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...list];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    const updates = await Promise.all(
      next.map((ex, idx) => updateExercise(ex.id, { order: idx + 1 }))
    );
    const ok = updates.every(Boolean);
    if (!ok) return;
    setExercises(updates);
  };

  const handleCourseChange = (event) => {
    const nextId = event.target.value;
    setSelectedCourseId(nextId);
    const params = new URLSearchParams(location.search);
    params.set("courseId", nextId);
    params.delete("lessonId");
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
  };

  const handleLessonChange = (event) => {
    const nextId = event.target.value;
    setSelectedLessonId(nextId);
    const params = new URLSearchParams(location.search);
    params.set("lessonId", nextId);
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to={`/courses-admin/lessons?courseId=${selectedCourseId || ""}`}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            <span aria-hidden="true">&lt;</span> Back to Lessons
          </Link>
          <p className="mt-2 text-sm text-slate-500">{selectedCourse?.title}</p>
          <h1 className="text-3xl font-bold text-slate-900">
            {selectedLesson?.title || "Lesson Content"}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => openEditor(null)}
          disabled={!selectedLessonId}
          className={cn(
            "inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm",
            selectedLessonId ? "bg-[#475dd7] hover:brightness-95" : "bg-slate-300"
          )}
        >
          + Content
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-700">Course</label>
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

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-slate-700">Lesson</label>
          <select
            value={selectedLessonId}
            onChange={handleLessonChange}
            className="min-w-[240px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {lessons.length === 0 ? (
              <option value="">No lessons yet</option>
            ) : null}
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Loading content.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedExercises.map((exercise, idx) => (
            <div
              key={exercise.id}
              className={cn(
                "group flex items-center justify-between gap-4 rounded-2xl border bg-white px-4 py-4 shadow-sm transition",
                "border-slate-200 hover:border-slate-300 hover:shadow-md",
                dragOverId === exercise.id && "border-indigo-400 ring-2 ring-indigo-200"
              )}
              draggable
              onDragStart={(event) => onDragStart(event, exercise.id)}
              onDragOver={(event) => onDragOver(event, exercise.id)}
              onDrop={(event) => onDrop(event, exercise.id)}
            >
              <div className="flex items-start gap-4 min-w-0">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600 cursor-grab"
                  title="Drag to reorder"
                >
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {EXERCISE_TYPES.find((t) => t.value === exercise.type)?.label || "Content"}
                  </span>
                  <p className="mt-2 text-sm text-slate-700 line-clamp-2">
                    {exercise.question || exercise.explanation_content || "Untitled content"}
                  </p>
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
                  onClick={() => handleMove(exercise.id, -1)}
                  disabled={idx == 0}
                  aria-label="Move content up"
                  title="Move up"
                >
                  <span className="text-sm text-slate-600">^</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
                    "border-transparent hover:border-slate-200 hover:bg-slate-50",
                    "cursor-pointer"
                  )}
                  onClick={() => handleMove(exercise.id, 1)}
                  disabled={idx == sortedExercises.length - 1}
                  aria-label="Move content down"
                  title="Move down"
                >
                  <span className="text-sm text-slate-600">v</span>
                </button>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
                    "border-transparent hover:border-slate-200 hover:bg-slate-50",
                    "cursor-pointer"
                  )}
                  onClick={() => openEditor(exercise)}
                  aria-label="Edit content"
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
                  onClick={() => handleDelete(exercise.id)}
                  aria-label="Delete content"
                  title="Delete"
                >
                  <img src={deleteIcon} alt="" className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}

          {sortedExercises.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              {selectedLessonId
                ? "No content yet. Click Content to add one."
                : "Select a lesson to view content."}
            </div>
          ) : null}
        </div>
      )}

      {draft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={closeEditor}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {editingExercise ? "Edit Content" : "New Content"}
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedLesson?.title || "Lesson content"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Close"
              >
                x
              </button>
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
                <p className="text-xs text-slate-500">
                  Use option_feedback for per-option feedback in multiple choice.
                </p>
              </div>
                </>
              )}

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
                  disabled={saving}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm",
                    saving ? "bg-slate-300" : "bg-[#475dd7] hover:brightness-95"
                  )}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
"""

    path.write_text(admin_content, encoding="utf-8")


def main() -> None:
    root = Path(__file__).resolve().parents[1] / ".lessons_app_build" / "src"
    layout = root / "app" / "Layout.jsx"
    utils = root / "app" / "utils.js"
    exercise_entity = root / "entities" / "Exercise.js"
    explanation_component = root / "components" / "content" / "Explanation.jsx"
    dialogue_component = root / "components" / "content" / "Dialogue.jsx"
    example_sentence_component = root / "components" / "content" / "ExampleSentenceSlide.jsx"
    word_order_component = root / "components" / "content" / "WordOrder.jsx"
    dictation_component = root / "components" / "content" / "Dictation.jsx"
    fill_blank_component = root / "components" / "content" / "FillBlank.jsx"
    translation_component = root / "components" / "content" / "Translation.jsx"
    my_courses_page = root / "pages" / "MyCourses.jsx"
    course_card_component = root / "components" / "student" / "CourseCard.jsx"
    enrollments_service = root / "services" / "enrollments.js"
    course_entity = root / "entities" / "Course.js"
    lesson_entity = root / "entities" / "Lesson.js"
    units_service = root / "services" / "units.js"
    course_detail_page = root / "pages" / "CourseDetail.jsx"
    multiple_choice_component = root / "components" / "content" / "MultipleChoice.jsx"
    matching_component = root / "components" / "content" / "Matching.jsx"
    sound_util = root / "utils" / "sound.js"
    admin_shell = root / "pages" / "admin" / "AdminShell.jsx"
    lesson_player = root / "pages" / "LessonPlayer.jsx"
    add_content_icon = root / "assets" / "icons" / "lessons" / "add-content.svg"
    admin_courses = root / "pages" / "admin" / "AdminCourses.jsx"
    admin_lessons = root / "pages" / "admin" / "AdminLessons.jsx"
    admin_content = root / "pages" / "admin" / "AdminContent.jsx"

    if layout.exists():
        patch_layout(layout)
    if utils.exists():
        patch_utils(utils)
    if exercise_entity.exists():
        patch_exercise_entity(exercise_entity)
    if explanation_component.exists():
        explanation_template = (
            Path(__file__).resolve().parent
            / "lessons_app_overrides"
            / "Explanation.jsx"
        )
        if explanation_template.exists():
            explanation_component.write_text(
                explanation_template.read_text(encoding="utf-8"),
                encoding="utf-8",
            )
    dialogue_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "Dialogue.jsx"
    )
    if dialogue_template.exists():
        dialogue_component.parent.mkdir(parents=True, exist_ok=True)
        dialogue_component.write_text(
            dialogue_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    example_sentence_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "ExampleSentenceSlide.jsx"
    )
    if example_sentence_template.exists():
        example_sentence_component.parent.mkdir(parents=True, exist_ok=True)
        example_sentence_component.write_text(
            example_sentence_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    word_order_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "WordOrder.jsx"
    )
    if word_order_template.exists():
        word_order_component.parent.mkdir(parents=True, exist_ok=True)
        word_order_component.write_text(
            word_order_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    dictation_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "Dictation.jsx"
    )
    if dictation_template.exists():
        dictation_component.parent.mkdir(parents=True, exist_ok=True)
        dictation_component.write_text(
            dictation_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    dictation_select_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "DictationSelect.jsx"
    )
    if dictation_select_template.exists():
        dictation_select_component = root / "components" / "content" / "DictationSelect.jsx"
        dictation_select_component.parent.mkdir(parents=True, exist_ok=True)
        dictation_select_component.write_text(
            dictation_select_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    dictation_focus_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "DictationFocus.jsx"
    )
    if dictation_focus_template.exists():
        dictation_focus_component = root / "components" / "content" / "DictationFocus.jsx"
        dictation_focus_component.parent.mkdir(parents=True, exist_ok=True)
        dictation_focus_component.write_text(
            dictation_focus_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    fill_blank_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "FillBlank.jsx"
    )
    if fill_blank_template.exists():
        fill_blank_component.parent.mkdir(parents=True, exist_ok=True)
        fill_blank_component.write_text(
            fill_blank_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    translation_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "Translation.jsx"
    )
    if translation_template.exists():
        translation_component.parent.mkdir(parents=True, exist_ok=True)
        translation_component.write_text(
            translation_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    my_courses_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "pages"
        / "MyCourses.jsx"
    )
    if my_courses_template.exists():
        my_courses_page.parent.mkdir(parents=True, exist_ok=True)
        my_courses_page.write_text(
            my_courses_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    course_card_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "student"
        / "CourseCard.jsx"
    )
    if course_card_template.exists():
        course_card_component.parent.mkdir(parents=True, exist_ok=True)
        course_card_component.write_text(
            course_card_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    enrollments_service_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "services"
        / "enrollments.js"
    )
    if enrollments_service_template.exists():
        enrollments_service.parent.mkdir(parents=True, exist_ok=True)
        enrollments_service.write_text(
            enrollments_service_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    course_entity_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "entities"
        / "Course.js"
    )
    if course_entity_template.exists():
        course_entity.parent.mkdir(parents=True, exist_ok=True)
        course_entity.write_text(
            course_entity_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    lesson_entity_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "entities"
        / "Lesson.js"
    )
    if lesson_entity_template.exists():
        lesson_entity.parent.mkdir(parents=True, exist_ok=True)
        lesson_entity.write_text(
            lesson_entity_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    units_service_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "services"
        / "units.js"
    )
    if units_service_template.exists():
        units_service.parent.mkdir(parents=True, exist_ok=True)
        units_service.write_text(
            units_service_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    course_detail_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "pages"
        / "CourseDetail.jsx"
    )
    if course_detail_template.exists():
        course_detail_page.parent.mkdir(parents=True, exist_ok=True)
        course_detail_page.write_text(
            course_detail_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    lesson_player_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "pages"
        / "LessonPlayer.jsx"
    )
    if lesson_player_template.exists():
        lesson_player.parent.mkdir(parents=True, exist_ok=True)
        lesson_player.write_text(
            lesson_player_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    multiple_choice_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "MultipleChoice.jsx"
    )
    if multiple_choice_template.exists():
        multiple_choice_component.parent.mkdir(parents=True, exist_ok=True)
        multiple_choice_component.write_text(
            multiple_choice_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    matching_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "Matching.jsx"
    )
    if matching_template.exists():
        matching_component.parent.mkdir(parents=True, exist_ok=True)
        matching_component.write_text(
            matching_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    fill_blanks_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "FillBlanksSelect.jsx"
    )
    if fill_blanks_template.exists():
        fill_blanks_component = root / "components" / "content" / "FillBlanksSelect.jsx"
        fill_blanks_component.parent.mkdir(parents=True, exist_ok=True)
        fill_blanks_component.write_text(
            fill_blanks_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    select_all_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "SelectAll.jsx"
    )
    if select_all_template.exists():
        select_all_component = root / "components" / "content" / "SelectAll.jsx"
        select_all_component.parent.mkdir(parents=True, exist_ok=True)
        select_all_component.write_text(
            select_all_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    conjugation_map_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "ConjugationMap.jsx"
    )
    if conjugation_map_template.exists():
        conjugation_map_component = root / "components" / "content" / "ConjugationMap.jsx"
        conjugation_map_component.parent.mkdir(parents=True, exist_ok=True)
        conjugation_map_component.write_text(
            conjugation_map_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    custom_block_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "CustomBlock.jsx"
    )
    if custom_block_template.exists():
        custom_block_component = root / "components" / "content" / "CustomBlock.jsx"
        custom_block_component.parent.mkdir(parents=True, exist_ok=True)
        custom_block_component.write_text(
            custom_block_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )

    prompt_image_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "PromptImage.jsx"
    )
    if prompt_image_template.exists():
        prompt_image_component = root / "components" / "content" / "PromptImage.jsx"
        prompt_image_component.parent.mkdir(parents=True, exist_ok=True)
        prompt_image_component.write_text(
            prompt_image_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )

    picture_choice_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "PictureChoice.jsx"
    )
    if picture_choice_template.exists():
        picture_choice_component = root / "components" / "content" / "PictureChoice.jsx"
        picture_choice_component.parent.mkdir(parents=True, exist_ok=True)
        picture_choice_component.write_text(
            picture_choice_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )

    picture_select_all_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "PictureSelectAll.jsx"
    )
    if picture_select_all_template.exists():
        picture_select_all_component = (
            root / "components" / "content" / "PictureSelectAll.jsx"
        )
        picture_select_all_component.parent.mkdir(parents=True, exist_ok=True)
        picture_select_all_component.write_text(
            picture_select_all_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )

    vocab_cards_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "VocabCards.jsx"
    )
    if vocab_cards_template.exists():
        vocab_cards_component = root / "components" / "content" / "VocabCards.jsx"
        vocab_cards_component.parent.mkdir(parents=True, exist_ok=True)
        vocab_cards_component.write_text(
            vocab_cards_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )

    error_spotting_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "ErrorSpotting.jsx"
    )
    if error_spotting_template.exists():
        error_spotting_component = root / "components" / "content" / "ErrorSpotting.jsx"
        error_spotting_component.parent.mkdir(parents=True, exist_ok=True)
        error_spotting_component.write_text(
            error_spotting_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    reorder_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "Reorder.jsx"
    )
    if reorder_template.exists():
        reorder_component = root / "components" / "content" / "Reorder.jsx"
        reorder_component.parent.mkdir(parents=True, exist_ok=True)
        reorder_component.write_text(
            reorder_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    morphology_builder_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "MorphologyBuilder.jsx"
    )
    if morphology_builder_template.exists():
        morphology_builder_component = (
            root / "components" / "content" / "MorphologyBuilder.jsx"
        )
        morphology_builder_component.parent.mkdir(parents=True, exist_ok=True)
        morphology_builder_component.write_text(
            morphology_builder_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    conjugation_drill_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "ConjugationDrill.jsx"
    )
    if conjugation_drill_template.exists():
        conjugation_drill_component = (
            root / "components" / "content" / "ConjugationDrill.jsx"
        )
        conjugation_drill_component.parent.mkdir(parents=True, exist_ok=True)
        conjugation_drill_component.write_text(
            conjugation_drill_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    content_embed_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "ContentEmbed.jsx"
    )
    if content_embed_template.exists():
        content_embed_component = root / "components" / "content" / "ContentEmbed.jsx"
        content_embed_component.parent.mkdir(parents=True, exist_ok=True)
        content_embed_component.write_text(
            content_embed_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    pronunciation_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "PronunciationImitation.jsx"
    )
    if pronunciation_template.exists():
        pronunciation_component = root / "components" / "content" / "PronunciationImitation.jsx"
        pronunciation_component.parent.mkdir(parents=True, exist_ok=True)
        pronunciation_component.write_text(
            pronunciation_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )

    for icon_name in ["custom-block.svg", "image-select.svg", "error-spotting.svg"]:
        icon_template = (
            Path(__file__).resolve().parent
            / "lessons_app_overrides"
            / "assets"
            / "icons"
            / "lessons"
            / icon_name
        )
        if icon_template.exists():
            icon_target = root / "assets" / "icons" / "lessons" / icon_name
            icon_target.parent.mkdir(parents=True, exist_ok=True)
            icon_target.write_text(icon_template.read_text(encoding="utf-8"), encoding="utf-8")
    panda_sprite_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "components"
        / "content"
        / "PandaSprite.jsx"
    )
    if panda_sprite_template.exists():
        panda_sprite_component = root / "components" / "content" / "PandaSprite.jsx"
        panda_sprite_component.parent.mkdir(parents=True, exist_ok=True)
        panda_sprite_component.write_text(
            panda_sprite_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    exercise_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "entities"
        / "Exercise.js"
    )
    if exercise_template.exists():
        exercise_entity = root / "entities" / "Exercise.js"
        exercise_entity.parent.mkdir(parents=True, exist_ok=True)
        exercise_entity.write_text(
            exercise_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    sound_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "utils"
        / "sound.js"
    )
    if sound_template.exists():
        sound_util.parent.mkdir(parents=True, exist_ok=True)
        sound_util.write_text(
            sound_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    admin_shell_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "AdminShell.jsx"
    )
    if admin_shell_template.exists():
        admin_shell.parent.mkdir(parents=True, exist_ok=True)
        admin_shell.write_text(
            admin_shell_template.read_text(encoding="utf-8"),
            encoding="utf-8",
        )
    add_content_template = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "assets"
        / "icons"
        / "lessons"
        / "add-content.svg"
    )
    if add_content_template.exists():
        add_content_icon.parent.mkdir(parents=True, exist_ok=True)
        add_content_icon.write_bytes(add_content_template.read_bytes())
    icons_dir = (
        Path(__file__).resolve().parent
        / "lessons_app_overrides"
        / "assets"
        / "icons"
        / "lessons"
    )
    if icons_dir.exists():
        for icon_path in (
            list(icons_dir.glob("*.svg"))
            + list(icons_dir.glob("*.png"))
            + list(icons_dir.glob("*.mp4"))
        ):
            target_path = root / "assets" / "icons" / "lessons" / icon_path.name
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_bytes(icon_path.read_bytes())
    if admin_courses.exists():
        patch_admin_courses(admin_courses)
    if admin_lessons.exists():
        patch_admin_lessons(admin_lessons)
    if admin_content.exists():
        patch_admin_content(admin_content)
    if lesson_player.exists():
        text = lesson_player.read_text(encoding="utf-8")
        if "Close lesson" not in text and "Close lesson player" not in text:
            text = text.replace(
                '    <div className="min-h-screen bg-slate-50 p-6">\\n',
                '    <div className="min-h-screen bg-slate-50 p-6 relative">\\n'
                '      {lesson?.course_id ? (\\n'
                '        <Link\\n'
                '          to={`/courses/${lesson.course_id}`}\\n'
                '          className="absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700 cursor-pointer"\\n'
                '          title="Close lesson"\\n'
                '          aria-label="Close lesson player"\\n'
                '        >\\n'
                '          <span aria-hidden="true" className="text-lg">×</span>\\n'
                '        </Link>\\n'
                '      ) : null}\\n',
            )
        if "import Dialogue" not in text:
            text = text.replace(
                'import Explanation from "../components/content/Explanation.jsx";\n',
                'import Explanation from "../components/content/Explanation.jsx";\n'
                'import Dialogue from "../components/content/Dialogue.jsx";\n',
            )
        if "import ExampleSentenceSlide" not in text:
            text = text.replace(
                'import Dialogue from "../components/content/Dialogue.jsx";\n',
                'import Dialogue from "../components/content/Dialogue.jsx";\n'
                'import ExampleSentenceSlide from "../components/content/ExampleSentenceSlide.jsx";\n',
            )
        if "import WordOrder" not in text:
            text = text.replace(
                'import ExampleSentenceSlide from "../components/content/ExampleSentenceSlide.jsx";\n',
                'import ExampleSentenceSlide from "../components/content/ExampleSentenceSlide.jsx";\n'
                'import WordOrder from "../components/content/WordOrder.jsx";\n',
            )
        if "import Dictation" not in text:
            text = text.replace(
                'import WordOrder from "../components/content/WordOrder.jsx";\n',
                'import WordOrder from "../components/content/WordOrder.jsx";\n'
                'import Dictation from "../components/content/Dictation.jsx";\n',
            )
        if "FillBlanksSelect" not in text:
            text = text.replace(
                'import Dictation from "../components/content/Dictation.jsx";\n',
                'import Dictation from "../components/content/Dictation.jsx";\n'
                'import FillBlanksSelect from "../components/content/FillBlanksSelect.jsx";\n',
            )
        if "ConjugationMap" not in text:
            text = text.replace(
                'import FillBlanksSelect from "../components/content/FillBlanksSelect.jsx";\n',
                'import FillBlanksSelect from "../components/content/FillBlanksSelect.jsx";\n'
                'import ConjugationMap from "../components/content/ConjugationMap.jsx";\n',
            )
        if "SelectAll" not in text:
            text = text.replace(
                'import ConjugationMap from "../components/content/ConjugationMap.jsx";\n',
                'import ConjugationMap from "../components/content/ConjugationMap.jsx";\n'
                'import SelectAll from "../components/content/SelectAll.jsx";\n',
            )
        if "dialogue: Dialogue" not in text:
            text = text.replace(
                "    matching: Matching,\n",
                "    matching: Matching,\n    dialogue: Dialogue,\n",
            )
        if "example_sentence: ExampleSentenceSlide" not in text:
            text = text.replace(
                "    dialogue: Dialogue,\n",
                "    dialogue: Dialogue,\n    example_sentence: ExampleSentenceSlide,\n",
            )
        if "word_order: WordOrder" not in text:
            text = text.replace(
                "    example_sentence: ExampleSentenceSlide,\n",
                "    example_sentence: ExampleSentenceSlide,\n    word_order: WordOrder,\n",
            )
        if "dictation: Dictation" not in text:
            text = text.replace(
                "    word_order: WordOrder,\n",
                "    word_order: WordOrder,\n    dictation: Dictation,\n",
            )
        if "fill_blanks_select: FillBlanksSelect" not in text:
            text = text.replace(
                "    dictation: Dictation,\n",
                "    dictation: Dictation,\n    fill_blanks_select: FillBlanksSelect,\n",
            )
        if "conjugation_map: ConjugationMap" not in text:
            text = text.replace(
                "    fill_blanks_select: FillBlanksSelect,\n",
                "    fill_blanks_select: FillBlanksSelect,\n    conjugation_map: ConjugationMap,\n",
            )
        if "select_all: SelectAll" not in text:
            text = text.replace(
                "    conjugation_map: ConjugationMap,\n",
                "    conjugation_map: ConjugationMap,\n    select_all: SelectAll,\n",
            )
        if 'e?.type === "matching"' in text and 'e?.type === "word_order"' not in text:
            text = text.replace(
                '      e?.type === "matching";\n',
                '      e?.type === "matching" ||\n      e?.type === "word_order";\n',
            )
        if 'e?.type === "fill_blank"' in text and 'e?.type === "fill_blanks_select"' not in text:
            text = text.replace(
                '      e?.type === "fill_blank" ||\n',
                '      e?.type === "fill_blank" ||\n      e?.type === "fill_blanks_select" ||\n',
            )
        if 'e?.type === "word_order"' in text and 'e?.type === "dictation"' not in text:
            text = text.replace(
                '      e?.type === "word_order";\n',
                '      e?.type === "word_order" ||\n      e?.type === "dictation";\n',
            )
        if 'e?.type === "dictation"' in text and 'e?.type === "conjugation_map"' not in text:
            text = text.replace(
                '      e?.type === "dictation";\n',
                '      e?.type === "dictation" ||\n      e?.type === "conjugation_map";\n',
            )
        if 'e?.type === "conjugation_map"' in text and 'e?.type === "select_all"' not in text:
            text = text.replace(
                '      e?.type === "conjugation_map";\n',
                '      e?.type === "conjugation_map" ||\n      e?.type === "select_all";\n',
            )
        if "to={`/course/" in text:
            text = text.replace("to={`/course/", "to={`/courses/")
        lesson_player.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
