import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./app/Layout.jsx";
import Home from "./pages/Home.jsx";
import MyCourses from "./pages/MyCourses.jsx";
import CourseDetail from "./pages/CourseDetail.jsx";
import LessonPlayer from "./pages/LessonPlayer.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminCourses from "./pages/admin/AdminCourses.jsx";
import AdminLessons from "./pages/admin/AdminLessons.jsx";
import AdminContent from "./pages/admin/AdminContent.jsx";
import AdminShell from "./pages/admin/AdminShell.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout currentPageName="Home">
              <Home />
            </Layout>
          }
        />
        <Route
          path="/courses"
          element={
            <Layout currentPageName="MyCourses">
              <MyCourses />
            </Layout>
          }
        />
        <Route
          path="/courses/:courseId"
          element={
            <Layout currentPageName="CourseDetail">
              <CourseDetail />
            </Layout>
          }
        />
        <Route
          path="/lesson/:lessonId"
          element={
            <Layout currentPageName="LessonPlayer">
              <LessonPlayer />
            </Layout>
          }
        />

        {/* Admin (nested) */}
        <Route
          path="/courses-admin"
          element={
            <Layout currentPageName="Admin">
              <AdminShell />
            </Layout>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="lessons" element={<AdminLessons />} />
          <Route path="content" element={<AdminContent />} />

          {/* Optional: redirect unknown admin subpaths back to dashboard */}
          <Route path="*" element={<Navigate to="/courses-admin" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
