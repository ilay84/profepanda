import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getCourseById } from "../services/courses.js";
import { listLessonsForCourse } from "../services/lessons.js";
import { listUnitsForCourse } from "../services/units.js";
import { listProgressForUser } from "../services/progress.js";
import { me } from "../services/auth.js";
import LessonCard from "../components/student/LessonCard.jsx";

import IconNotStarted from "../assets/icons/lessons/not-started.svg";
import IconComplete from "../assets/icons/lessons/complete.svg";
import IconInProgress from "../assets/icons/lessons/in-progress.svg";
import IconLesson from "../assets/icons/lessons/lesson.svg";
import IconClock from "../assets/icons/lessons/clock.svg";
import IconXp from "../assets/icons/lessons/xp.svg";
import IconXpColored from "../assets/icons/lessons/xp-colored.svg";
import IconCaretDown from "../assets/icons/lessons/down-caret.svg";
import IconCaretUp from "../assets/icons/lessons/up-caret.svg";

function renderInlineMarkdown(text, baseClassName = "text-slate-900") {
  if (!text) return "";
  const lines = String(text).split(/\r?\n/);
  const nodes = [];

  const renderWithBackticks = (content, keyPrefix, inlineClassName = baseClassName) => {
    const parts = content.split(/(`[^`]+`)/g).filter(Boolean);
    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        const inner = part.slice(1, -1);
        return (
          <span key={`${keyPrefix}-tick-${index}`} className="font-semibold text-[#475dd7]">
            {inner}
          </span>
        );
      }
      return (
        <span key={`${keyPrefix}-txt-${index}`} className={inlineClassName}>
          {part}
        </span>
      );
    });
  };

  const renderLine = (line, lineIndex) => {
    const parts = line
      .split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
      .filter(Boolean);
    return (
      <span key={`md-line-${lineIndex}`}>
        {parts.map((part, index) => {
          if (part.startsWith("`") && part.endsWith("`")) {
            const content = part.slice(1, -1);
            return (
              <span key={`md-${lineIndex}-${index}`} className="font-semibold text-[#475dd7]">
                {content}
              </span>
            );
          }
          if (part.startsWith("**") && part.endsWith("**")) {
            const content = part.slice(2, -2);
            return (
              <span key={`md-${lineIndex}-${index}`} className={`font-semibold ${baseClassName}`}>
                {renderWithBackticks(content, `md-b-${lineIndex}-${index}`, baseClassName)}
              </span>
            );
          }
          if (part.startsWith("*") && part.endsWith("*")) {
            const content = part.slice(1, -1);
            return (
              <em key={`md-${lineIndex}-${index}`} className={baseClassName}>
                {renderWithBackticks(content, `md-i-${lineIndex}-${index}`, baseClassName)}
              </em>
            );
          }
          return (
            <span key={`md-${lineIndex}-${index}`} className={baseClassName}>
              {part}
            </span>
          );
        })}
      </span>
    );
  };

  lines.forEach((line, index) => {
    if (index > 0) {
      nodes.push(<br key={`md-br-${index}`} />);
    }
    if (line.trim() === "---") {
      nodes.push(<hr key={`md-hr-${index}`} className="my-4 border-slate-200" />);
      return;
    }
    nodes.push(renderLine(line, index));
  });

  return nodes;
}


function renderDescriptionMarkdown(text, className, inlineClassName = "text-slate-900") {
  if (!text) return null;
  const lines = String(text).split("\n");
  const nodes = [];
  let bullets = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    const items = bullets.map((line, index) => (
      <li key={`li-${index}`}>{renderInlineMarkdown(line, inlineClassName)}</li>
    ));
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="ml-4 list-disc space-y-1">
        {items}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      return;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      bullets.push(line.slice(2));
      return;
    }
    flushBullets();
    nodes.push(
      <p key={`p-${nodes.length}`} className="m-0">
        {renderInlineMarkdown(line, inlineClassName)}
      </p>
    );
  });

  flushBullets();

  return <div className={className}>{nodes}</div>;
}

export default function CourseDetail() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [units, setUnits] = useState([]);
  const [openUnits, setOpenUnits] = useState({});
  const [masteredByLessonId, setMasteredByLessonId] = useState({});
  const [courseProgress, setCourseProgress] = useState(null);

  useEffect(() => {
    (async () => {
      const courseData = await getCourseById(courseId);
      const lessonData = await listLessonsForCourse(courseId);
      const unitData = await listUnitsForCourse(courseId);

      setCourse(courseData);
      setLessons(lessonData);
      setUnits(unitData);
      setOpenUnits({});

      const user = await me();
      if (!user?.email) {
        setMasteredByLessonId({});
        setCourseProgress(null);
        return;
      }

      const allProgress = await listProgressForUser(user.email);
      const progress = allProgress.find((p) => p.course_id === courseId) || null;

      setCourseProgress(progress);

      const mastered = {};
      for (const id of progress?.completed_lessons || []) {
        mastered[id] = true;
      }

      setMasteredByLessonId(mastered);
    })();
  }, [courseId]);

  const lessonGroups = useMemo(() => {
    const sortedLessons = [...lessons].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
    const sortedUnits = [...units].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });

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
  }, [lessons, units]);
  const hasUnits = units.length > 0;

  if (!course) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Course not found</h1>
      </div>
    );
  }

  const totalLessons = lessons.length;
  const completedLessons = lessons.reduce(
    (acc, l) => acc + (masteredByLessonId[l.id] ? 1 : 0),
    0
  );
  const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const totalXp = lessons.reduce((acc, l) => acc + (Number(l.xp_reward) || 0), 0);
  const earnedXp = lessons.reduce(
    (acc, l) => acc + (masteredByLessonId[l.id] ? (Number(l.xp_reward) || 0) : 0),
    0
  );

  const timeSpentMinutes = Math.max(
    0,
    Math.round((Number(courseProgress?.time_spent_seconds) || 0) / 60)
  );

  const isCourseMastered = totalLessons > 0 && completedLessons >= totalLessons;

  const toggleUnit = (unitId) => {
    setOpenUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="bg-gradient-to-br from-slate-900 to-slate-700 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-200">
                  {isCourseMastered ? "Mastered" : course.level || "beginner"}
                </span>
              </div>

              <div className="space-y-1">
                <h1 className="text-3xl font-bold text-white">
                  {renderInlineMarkdown(String(course.title || ""), "text-white")}
                </h1>
                {course.description ? (
                  renderDescriptionMarkdown(
                    course.description,
                    "max-w-2xl text-slate-200",
                    "text-slate-200"
                  )
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white ring-1 ring-white/10">
                  <img src={IconLesson} alt="" className="h-4 w-4 opacity-80" />
                  <span className="font-semibold">
                    {completedLessons}/{totalLessons}
                  </span>
                  <span className="text-white/80">lessons</span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white ring-1 ring-white/10">
                  <img src={IconXp} alt="" className="h-4 w-4 opacity-80" />
                  <span className="font-semibold">
                    {earnedXp}/{totalXp}
                  </span>
                  <span className="text-white/80">XP</span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white ring-1 ring-white/10">
                  <img src={IconClock} alt="" className="h-4 w-4 opacity-80" />
                  <span className="font-semibold">{timeSpentMinutes}</span>
                  <span className="text-white/80">min spent</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between text-sm text-white">
              <span className="font-semibold">Your progress</span>
              <span className="text-white/80">
                {completedLessons}/{totalLessons} lessons
              </span>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/20">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${
                  isCourseMastered ? "bg-emerald-400" : "bg-indigo-400"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-white/80">
              <span>{earnedXp} XP earned</span>
              <span>{pct}% complete</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Lessons</h2>
        </div>

        {lessons.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
            <p className="text-slate-600">No lessons yet.</p>
          </div>
        ) : hasUnits ? (
          <div className="space-y-4">
            {lessonGroups.map((group, groupIndex) => {
              const isOpen = !!openUnits[group.id];
              const unitLabel = group.isPseudo ? null : `Unit ${groupIndex + 1}`;
              return (
                <div key={group.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggleUnit(group.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl bg-indigo-50/40 px-4 py-3 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <img
                          src={isOpen ? IconCaretUp : IconCaretDown}
                          alt=""
                          className="h-5 w-5 shrink-0 sm:h-4 sm:w-4"
                        />
                      </span>
                      <div>
                        {unitLabel ? (
                          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                            {unitLabel}
                          </div>
                        ) : null}
                        <div className="text-lg font-semibold text-slate-900">
                          {renderInlineMarkdown(String(group.title || ""))}
                        </div>
                        {group.description ? (
                          <div className="text-sm text-slate-500">
                            {renderDescriptionMarkdown(group.description, "")}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <span className="text-sm text-slate-400">
                      {group.lessons.length} lessons
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="divide-y divide-slate-200 px-4 pb-2">
                      {group.lessons.map((lesson, index) => {
                        const mastered = !!masteredByLessonId[lesson.id];
                        const firstIncompleteIndex = group.lessons.findIndex(
                          (l) => !masteredByLessonId[l.id]
                        );
                        const started =
                          !mastered &&
                          firstIncompleteIndex !== -1 &&
                          index < firstIncompleteIndex;

                        return (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between gap-4 py-4 transition hover:bg-slate-50/70"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 sm:h-10 sm:w-10 ${
                                  mastered
                                    ? "bg-emerald-50 ring-emerald-200"
                                    : started
                                    ? "bg-indigo-50 ring-indigo-200"
                                    : "bg-slate-50 ring-slate-200"
                                }`}
                              >
                                <img
                                  src={
                                    mastered
                                      ? IconComplete
                                      : started
                                      ? IconInProgress
                                      : IconNotStarted
                                  }
                                  alt=""
                                  className="h-6 w-6 shrink-0 sm:h-5 sm:w-5"
                                />
                              </div>

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                  Lesson {index + 1}
                                </span>

                                  {mastered ? (
                                    <span className="inline-flex items-center rounded-full bg-[#80ac5f] px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                                      Mastered
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                      Not started
                                    </span>
                                  )}
                                </div>

                                <div className="text-lg font-semibold text-slate-900">
                                  {renderInlineMarkdown(String(lesson.title || ""))}
                                </div>

                                {lesson.description ? (
                                  <div className="text-base text-slate-600">
                                    {renderDescriptionMarkdown(lesson.description, "")}
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold leading-none ring-1 whitespace-nowrap ${
                                  mastered
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                    : "bg-indigo-50 text-indigo-700 ring-indigo-200"
                                }`}
                              >
                                <img src={IconXpColored} alt="" className="h-3.5 w-3.5 shrink-0" />
                                <span className="tabular-nums">{Number(lesson.xp_reward) || 0}</span>
                                <span>XP</span>
                              </span>

                              <LessonCard lesson={lesson} mastered={mastered} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, index) => {
              const mastered = !!masteredByLessonId[lesson.id];
              const firstIncompleteIndex = lessons.findIndex(
                (l) => !masteredByLessonId[l.id]
              );
              const started =
                !mastered && firstIncompleteIndex !== -1 && index < firstIncompleteIndex;

              return (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50/70"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 sm:h-10 sm:w-10 ${
                        mastered
                          ? "bg-emerald-50 ring-emerald-200"
                          : started
                          ? "bg-indigo-50 ring-indigo-200"
                          : "bg-slate-50 ring-slate-200"
                      }`}
                    >
                      <img
                        src={
                          mastered ? IconComplete : started ? IconInProgress : IconNotStarted
                        }
                        alt=""
                        className="h-6 w-6 shrink-0 sm:h-5 sm:w-5"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                          Lesson {index + 1}
                        </span>

                        {mastered ? (
                          <span className="inline-flex items-center rounded-full bg-[#80ac5f] px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                            Mastered
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                            Not started
                          </span>
                        )}
                      </div>

                      <div className="text-lg font-semibold text-slate-900">
                        {renderInlineMarkdown(String(lesson.title || ""))}
                      </div>

                      {lesson.description ? (
                        <div className="text-base text-slate-600">
                          {renderDescriptionMarkdown(lesson.description, "")}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold leading-none ring-1 whitespace-nowrap ${
                        mastered
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-indigo-50 text-indigo-700 ring-indigo-200"
                      }`}
                    >
                      <img src={IconXpColored} alt="" className="h-3.5 w-3.5 shrink-0" />
                      <span className="tabular-nums">{Number(lesson.xp_reward) || 0}</span>
                      <span>XP</span>
                    </span>

                    <LessonCard lesson={lesson} mastered={mastered} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
