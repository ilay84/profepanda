import { useEffect, useState } from "react";
import { listPublishedCourses } from "../services/courses.js";
import CourseCard from "../components/student/CourseCard.jsx";

export default function Home() {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    (async () => {
      const data = await listPublishedCourses();
      setCourses(data);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Home</h1>

      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">
          Available Courses
        </h2>

        {courses.length === 0 ? (
          <p className="text-slate-500">No courses yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
