"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavbarProps {
  theme?: "light" | "dark";
}

export default function Navbar({ theme = "light" }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isDoctorRoute = Boolean(pathname?.startsWith("/doctor") || (theme as string) === "dark");
  const isDark = isDoctorRoute;

  async function handleDoctorSignOut() {
    await fetch("/api/doctor-login", { method: "DELETE" });
    router.push("/doctor-login");
    router.refresh();
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all ${
        isDark
          ? "border-b border-slate-800/90 bg-slate-950/80 backdrop-blur-md text-slate-100"
          : "border-b border-slate-100/90 bg-white/80 backdrop-blur-md text-slate-900"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href={isDoctorRoute ? "/doctor" : "/"} className="group flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md shadow-blue-500/25 transition-transform duration-300 group-hover:scale-105">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.3}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xl font-extrabold tracking-tight ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                MediBridge
              </span>
              <span className="rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-1.5 py-0.5 text-xs font-black tracking-wider text-white shadow-xs">
                {isDoctorRoute ? "CLINICIAN" : "AI"}
              </span>
            </div>
            <span
              className={`hidden text-[11px] font-medium tracking-wide sm:block ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {isDoctorRoute
                ? "Authorized Clinical Triage Environment"
                : "Clinical Triage & Healthcare Operating System"}
            </span>
          </div>
        </Link>

        {isDoctorRoute ? (
          /* DOCTOR-ONLY RESTRICTED NAVIGATION */
          <nav className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Clinician Active</span>
            </div>

            <button
              onClick={handleDoctorSignOut}
              className="rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-xs font-bold text-slate-200 shadow-xs transition hover:bg-slate-700 hover:text-white active:scale-95"
            >
              Sign Out
            </button>
          </nav>
        ) : (
          /* PATIENT STANDARD NAVIGATION */
          <nav className="flex items-center gap-1.5 sm:gap-3">
            <Link
              href="/patient/dashboard"
              className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100/80 hover:text-blue-600 transition-all duration-200"
            >
              Patient Dashboard
            </Link>
            <Link
              href="/appointment"
              className="hidden rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100/80 hover:text-blue-600 transition-all duration-200 md:block"
            >
              Book Visit
            </Link>
            <Link
              href="/doctor"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700"
            >
              <svg
                className="h-3.5 w-3.5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>Doctor Portal</span>
            </Link>
            <Link
              href="/appointment"
              className="relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/25 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/35 active:scale-95"
            >
              <span>Book Appointment</span>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
