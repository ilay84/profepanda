export function createPageUrl(pageName) {
  const routes = {
    Catalog: "/courses",
    Home: "/courses",
    MyCourses: "/courses?view=my",
    CourseDetail: "/courses/:courseId",
    LessonPlayer: "/lesson/:lessonId",

    AdminDashboard: "/courses-admin",
    AdminCourses: "/courses-admin/courses",
    AdminLessons: "/courses-admin/lessons",
    AdminContent: "/courses-admin/content",
    AdminExercises: "/courses-admin/content"
  };

  return routes[pageName] ?? "/";
}
