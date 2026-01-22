import { Link } from "react-router-dom";

export default function LessonCard({
  lesson,
  mastered = false,
  started = false,
}) {
  const id = lesson?.id ?? "example-lesson";

  const label = mastered ? "Review" : started ? "Continue" : "Start";

  const className = mastered
    ? "inline-flex items-center justify-center rounded-xl bg-[#80ac5f] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#6f9951] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#80ac5f]"
    : started
    ? "inline-flex items-center justify-center rounded-xl bg-[#475dd7] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3b4fc3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475dd7]"
    : "inline-flex items-center justify-center rounded-xl bg-[#d25c7f] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#be4d70] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d25c7f]";

  return (
    <Link to={`/lesson/${id}`} className={className}>
      {label}
    </Link>
  );
}
