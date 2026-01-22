import { Outlet, useLocation, useNavigate } from "react-router-dom";

function getAdminHeader(pathname) {
  if (pathname === "/courses-admin") {
    return {
      title: "Admin Dashboard",
      subtitle: "Manage your courses and content",
      primaryAction: null,
    };
  }

  if (pathname.startsWith("/courses-admin/courses")) {
    return {
      title: "Courses",
      subtitle: "Create and manage courses",
      primaryAction: { label: "New Course" },
    };
  }

  if (pathname.startsWith("/courses-admin/lessons")) {
    return {
      title: "Lessons",
      subtitle: "Create and manage lessons",
      primaryAction: null,
    };
  }

  if (pathname.startsWith("/courses-admin/content")) {
    return {
      title: "Content",
      subtitle: "Manage exercises and other content",
      primaryAction: null,
    };
  }

  return {
    title: "Admin",
    subtitle: "",
    primaryAction: null,
  };
}

export default function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const header = getAdminHeader(location.pathname);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            {header.title}
          </h1>
          {header.subtitle ? (
            <p className="text-slate-600">{header.subtitle}</p>
          ) : null}
        </div>

        {header.primaryAction ? (
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl bg-[#475dd7] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#475dd7]/30 focus-visible:ring-offset-2 cursor-pointer"
            onClick={() => {
              if (!location.pathname.startsWith("/courses-admin/courses")) return;
              window.dispatchEvent(new CustomEvent("ppx:new-course"));
              const params = new URLSearchParams(location.search);
              params.set("newCourse", "1");
              navigate({
                pathname: "/courses-admin/courses",
                search: `?${params.toString()}`,
              });
            }}
          >
            <span className="mr-2 text-base leading-none">+</span>
            {header.primaryAction.label}
          </button>
        ) : null}
      </div>

      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}
