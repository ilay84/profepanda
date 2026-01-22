import { Link } from "react-router-dom";

function clamp01(n) {
  const x = Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(1, x));
}

function toPct(progress) {
  const n = Number(progress);
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? clamp01(n / 100) : clamp01(n);
}

function getLevel(course) {
  return (
    course?.level ??
    course?.difficulty ??
    course?.meta?.level ??
    "beginner"
  );
}

function getDescription(course) {
  return course?.description ?? course?.summary ?? course?.blurb ?? "";
}

function renderInlineMarkdown(text) {
  if (!text) return "";
  const lines = String(text).split(/\r?\n/);
  const nodes = [];

  const renderWithBackticks = (content, keyPrefix, baseClassName = "text-slate-900") => {
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
        <span key={`${keyPrefix}-txt-${index}`} className={baseClassName}>
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
              <span key={`md-${lineIndex}-${index}`} className="font-semibold text-slate-900">
                {renderWithBackticks(content, `md-b-${lineIndex}-${index}`)}
              </span>
            );
          }
          if (part.startsWith("*") && part.endsWith("*")) {
            const content = part.slice(1, -1);
            return (
              <em key={`md-${lineIndex}-${index}`} className="text-slate-900">
                {renderWithBackticks(content, `md-i-${lineIndex}-${index}`)}
              </em>
            );
          }
          return (
            <span key={`md-${lineIndex}-${index}`} className="text-slate-900">
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


function getLangLine(course) {
  const from =
    course?.source_language ??
    course?.fromLanguage ??
    course?.sourceLanguage ??
    course?.langFrom ??
    course?.languages?.from ??
    "English";

  const to =
    course?.target_language ??
    course?.toLanguage ??
    course?.targetLanguage ??
    course?.langTo ??
    course?.languages?.to ??
    "Spanish";

  return `${from}  ${to}`;
}

function getCounts(course) {
  const completed =
    course?.progress?.completedLessons ??
    course?.completed_lessons ??
    course?.completedLessons ??
    course?.lessonsCompleted ??
    0;

  const total =
    course?.progress?.totalLessons ??
    course?.total_lessons ??
    course?.totalLessons ??
    course?.lessonCount ??
    course?.lessons?.length ??
    0;

  return {
    completed: Number.isFinite(Number(completed)) ? Number(completed) : 0,
    total: Number.isFinite(Number(total)) ? Number(total) : 0,
  };
}

function getImage(course) {
  return (
    course?.image_url ??
    course?.imageUrl ??
    course?.image ??
    course?.cover_image_url ??
    course?.coverImageUrl ??
    course?.coverImage ??
    null
  );
}

export default function CourseCard({
  course,
  showEnroll = false,
  onEnroll,
  onUnenroll,
}) {
  const id = course?.id ?? "example-course";
  const title = course?.title ?? "Course title";
  const description = getDescription(course);
  const level = String(getLevel(course)).toLowerCase();
  const langLine = getLangLine(course);
  const isEnrolled = Boolean(course?.is_enrolled);

  const { completed, total } = getCounts(course);

  const explicitProgress =
    course?.progress?.percent ??
    course?.progress_percent ??
    course?.progressPercent ??
    course?.progress ??
    null;

  const inferred = total > 0 ? completed / total : 0;
  const p = explicitProgress == null ? clamp01(inferred) : toPct(explicitProgress);

  const pctLabel = Math.round(p * 100);
  const imageUrl = getImage(course);
  const isMastered = Boolean(course?.is_mastered) || (total > 0 && completed >= total);

  return (
    <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300">
      <Link
        to={`/courses/${id}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <div className="relative h-36 bg-slate-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200" />
          )}

          <div className="absolute left-3 bottom-3">
            {isMastered ? (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                Mastered
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-200">
                {level}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900">
              {renderInlineMarkdown(String(title))}
            </h3>
            <span className="mt-0.5 text-slate-400 transition group-hover:text-slate-500">
              &gt;
            </span>
          </div>

          {description ? (
            <div className="line-clamp-2 text-sm text-slate-600">
              {renderInlineMarkdown(String(description))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Learn through short, focused lessons with practice built in.
            </p>
          )}

          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-slate-600">{langLine}</p>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {total > 0
                  ? `${completed} of ${total} lessons`
                  : "Lessons coming soon"}
              </span>
              <span className="tabular-nums">{pctLabel}%</span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${
                  isMastered ? "bg-emerald-600" : "bg-indigo-600"
                }`}
                style={{ width: `${pctLabel}%` }}
              />
            </div>
          </div>
        </div>
      </Link>

      {showEnroll && (
        <div className="px-4 pb-4 flex items-center gap-2">
          {isEnrolled ? (
            <>
              <span className="inline-flex items-center rounded-full bg-[#80ac5f]/10 px-3 py-1 text-xs font-semibold text-[#2f5d22] ring-1 ring-[#80ac5f]/30">
                Enrolled
              </span>
              <button
                type="button"
                onClick={() => onUnenroll?.(course)}
                className="inline-flex items-center rounded-xl px-3 py-2 text-xs font-semibold border border-[#d25c7f] text-[#d25c7f] hover:bg-[#fde7ee] cursor-pointer"
              >
                Remove course
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onEnroll?.(course)}
              className="inline-flex items-center rounded-xl px-3 py-2 text-xs font-semibold text-white bg-[#475dd7] hover:bg-[#3f53c4] cursor-pointer"
            >
              Enroll
            </button>
          )}
        </div>
      )}
    </div>
  );
}
