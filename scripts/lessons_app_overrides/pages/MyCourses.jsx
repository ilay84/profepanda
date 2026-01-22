import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import CourseCard from "../components/student/CourseCard.jsx";
import { listMyCourses, listPublishedCourses } from "../services/courses.js";
import { cancelEnrollment, enrollInCourse } from "../services/enrollments.js";
import * as auth from "../services/auth.js";

function useViewMode() {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("view") === "my" ? "my" : "catalog";
  }, [location.search]);
}

export default function MyCourses() {
  const location = useLocation();
  const view = useViewMode();
  const [courses, setCourses] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await auth.me();
      setUser(me);
      const data = view === "my" ? await listMyCourses() : await listPublishedCourses();
      const normalized =
        view === "my"
          ? data.map((course) => ({ ...course, is_enrolled: true }))
          : data;
      setCourses(normalized);
    })();
  }, [view, location.search]);

  const handleEnroll = async (course) => {
    if (!user) {
      const next = encodeURIComponent(location.pathname + location.search);
      window.location.href = `/auth/login?next=${next}`;
      return;
    }
    const res = await enrollInCourse(course.id);
    if (!res) return;
    if (view === "my") {
      const data = await listMyCourses();
      setCourses(data);
      return;
    }
    setCourses((prev) =>
      prev.map((c) => (c.id === course.id ? { ...c, is_enrolled: true } : c))
    );
  };
  const handleUnenroll = async (course) => {
    if (!user) return;
    const res = await cancelEnrollment(course.id);
    if (!res) return;
    if (view === "my") {
      const data = await listMyCourses();
      setCourses(data);
      return;
    }
    setCourses((prev) =>
      prev.map((c) => (c.id === course.id ? { ...c, is_enrolled: false } : c))
    );
  };

  const heading = view === "my" ? "My Courses" : "Courses";
  const subtitle =
    view === "my"
      ? "Pick a course to start learning or continue where you left off."
      : "Browse the catalog and enroll to start learning.";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-slate-900">{heading}</h1>
        <p className="text-slate-600">{subtitle}</p>
      </div>

      {view === "my" && !user ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <p className="text-slate-600">
            Sign in to see your enrolled courses.
          </p>
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <p className="text-slate-600">No courses yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              showEnroll
              onEnroll={handleEnroll}
              onUnenroll={handleUnenroll}
            />
          ))}
        </div>
      )}
    </div>
  );
}
