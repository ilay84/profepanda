// src/app/Layout.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import * as auth from "../services/auth.js";
import { listProgressForUser } from "../services/progress.js";
import {
  Home,
  BookOpen,
  LogOut,
  Menu,
  X,
  Shield,
  Flame,
  Zap,
} from "lucide-react";

/**
 * Temporary local shim:
 * - We'll replace these with real services once we migrate auth/data.
 */

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Button({ variant = "default", size, className, children, ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    ghost: "bg-transparent hover:bg-slate-100",
    outline: "border border-slate-200 hover:bg-slate-50",
  };
  const sizes = {
    sm: "h-9 px-3",
    icon: "h-9 w-9",
  };

  return (
    <button
      className={cn(
        base,
        variants[variant] || variants.default,
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [totalXp, setTotalXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const menuRef = useRef(null);
  const langRef = useRef(null);
  const location = useLocation();

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
  };
  const loginHref = `/auth/login?next=${encodeURIComponent(location.pathname + location.search)}`;

  useEffect(() => {
    loadUser();
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        menuRef.current.removeAttribute("open");
      }
      if (langRef.current && !langRef.current.contains(event.target)) {
        langRef.current.removeAttribute("open");
      }
    }

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const loadUser = async () => {
    try {
      const userData = await auth.me();
      setUser(userData);

      if (userData?.email) {
        const progress = await listProgressForUser(userData.email);
        if (progress.length > 0) {
          const total = progress.reduce((sum, p) => sum + (p.total_xp || 0), 0);
          const maxStreak = Math.max(...progress.map((p) => p.current_streak || 0));
          setTotalXp(total);
          setStreak(maxStreak);
        } else {
          setTotalXp(0);
          setStreak(0);
        }
      } else {
        setTotalXp(0);
        setStreak(0);
      }
    } catch {
      // Not logged in
      setTotalXp(0);
      setStreak(0);
    }
  };

  const isAdmin = user?.role === "admin";
  const isAdminPage = location.pathname.startsWith("/courses-admin");
  const isLessonPlayer = currentPageName === "LessonPlayer";

  // Minimal layout for lesson player
  if (isLessonPlayer) {
    return <div className="min-h-screen">{children}</div>;
  }

  const studentNavItems = [
    { name: t("Courses Home", "Inicio de cursos"), page: "Catalog", icon: BookOpen },
    { name: t("My Courses", "Mis cursos"), page: "MyCourses", icon: BookOpen },
  ];

  const adminNavItems = [
    { name: "Courses", page: "AdminCourses", icon: BookOpen },
  ];

  const navItems = isAdminPage ? adminNavItems : studentNavItems;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
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
    </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-[112px] bottom-0 w-64 bg-white border-r border-slate-100 z-40 transform transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const url = linkWithLang(createPageUrl(item.page));
            const isActive = (() => {
            const basePath = url.split("?")[0];
            if (location.pathname !== basePath) return false;
            const currentParams = new URLSearchParams(location.search);
            const targetParams = new URLSearchParams(url.split("?")[1] || "");
            currentParams.delete("lang");
            targetParams.delete("lang");
            const currentView = currentParams.get("view") || "";
            const targetView = targetParams.get("view") || "";
            return currentView === targetView;
          })();

            return (
              <Link
                key={item.page}
                to={url}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-white")} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-[112px]">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
