"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import EmergencyModal from "@/components/EmergencyModal";
import { useLanguage } from "@/context/LanguageContext";

const coreFeatures = [
  {
    icon: "🗓️",
    title: "Instant Appointment Booking",
    desc: "Seamlessly select clinical department, physician, and consultation slot with real-time unique token generation (#A023 / MB-743721).",
    badge: "Token-Enabled",
    link: "/appointment",
  },
  {
    icon: "🤖",
    title: "xAI Grok Clinical Summary",
    desc: "Grok Cloud intelligence synthesizes patient symptoms into structured chief complaints, key observations, and urgent red-flag alerts.",
    badge: "AI Powered",
    link: "/patient-details",
  },
  {
    icon: "📁",
    title: "Cloudinary Document Vault",
    desc: "High-speed encrypted document repository for lab results, radiology PDFs, and clinical prescriptions with instant previews.",
    badge: "Encrypted Storage",
    link: "/patient-details",
  },
  {
    icon: "🩺",
    title: "Doctor Urgency Queue",
    desc: "Physician triage board automatically prioritizing high-risk patients with quick status toggles (Waiting ⇋ Completed).",
    badge: "Physician Portal",
    link: "/hospital",
  },
  {
    icon: "⚡",
    title: "Patient Live Dashboard",
    desc: "Live tracker displaying active queue position, token status badge, confirmed appointment slip, and attached medical reports.",
    badge: "Live Status",
    link: "/patient/dashboard",
  },
  {
    icon: "🛡️",
    title: "Protected Doctor Auth",
    desc: "Secure clinical access with httpOnly authenticated session cookies and protected triage patient records.",
    badge: "HIPAA Compliant",
    link: "/doctor-login",
  },
  {
    icon: "📋",
    title: "Multi-Department Routing",
    desc: "Direct appointment matching across Cardiology, Neurology, Dermatology, Orthopedics, Pediatrics, and Internal Medicine.",
    badge: "Smart Dispatch",
    link: "/appointment",
  },
];

export default function Home() {
  const { t } = useLanguage();
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between selection:bg-[#00A896] selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* ======================================================== */}
        {/* REPASSE CURVED SEA-TEAL HERO CANVAS                     */}
        {/* ======================================================== */}
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#00A896] via-[#028090] to-[#02C39A] p-8 sm:p-12 lg:p-14 text-white shadow-xl shadow-teal-900/10">
            {/* Ambient Blurred Circles */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute left-1/3 -bottom-24 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />

            <div className="relative z-10 grid gap-10 lg:grid-cols-12 lg:items-center">
              {/* Left Column: Clinical Intake & CTAs */}
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-teal-50 backdrop-blur-md border border-white/20">
                  <span className="flex h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
                  <span>✨ {t("hero_tag")}</span>
                </div>

                <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl text-white leading-[1.12]">
                  {t("hero_title")}{" "}
                  <span className="text-amber-300">{t("hero_title_highlight")}</span>
                </h1>

                <p className="mt-4 max-w-2xl text-base text-teal-50/90 leading-relaxed sm:text-lg">
                  {t("hero_subtitle")}
                </p>

                {/* CTAs with Repasse rounded pills */}
                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <Link
                    href="/appointment"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm sm:text-base font-extrabold text-[#028090] shadow-md transition-all duration-300 hover:scale-105 hover:bg-teal-50 hover:shadow-lg active:scale-95"
                  >
                    <span>{t("btn_book_consultation")}</span>
                    <span className="text-lg">→</span>
                  </Link>

                  <Link
                    href="/patient/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-4 text-sm sm:text-base font-bold text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/20 active:scale-95"
                  >
                    <span>{t("btn_patient_dashboard")}</span>
                  </Link>

                  <Link
                    href="/hospital"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-4 text-sm sm:text-base font-bold text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/20 active:scale-95"
                  >
                    <svg className="h-4 w-4 text-teal-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{t("btn_hospital_portal")}</span>
                  </Link>
                </div>

                {/* Metric Strip */}
                <div className="mt-10 grid grid-cols-3 gap-3 border-t border-white/20 pt-6">
                  <div>
                    <span className="text-[11px] font-semibold text-teal-100 uppercase tracking-wider">
                      {t("metric_dispatch")}
                    </span>
                    <p className="mt-0.5 text-xl sm:text-2xl font-black text-white">{t("metric_dispatch_val")}</p>
                    <span className="text-[10px] text-teal-100/80">{t("metric_dispatch_sub")}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-teal-100 uppercase tracking-wider">
                      {t("metric_accuracy")}
                    </span>
                    <p className="mt-0.5 text-xl sm:text-2xl font-black text-white">{t("metric_accuracy_val")}</p>
                    <span className="text-[10px] text-teal-100/80">{t("metric_accuracy_sub")}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-teal-100 uppercase tracking-wider">
                      {t("metric_delay")}
                    </span>
                    <p className="mt-0.5 text-xl sm:text-2xl font-black text-white">{t("metric_delay_val")}</p>
                    <span className="text-[10px] text-teal-100/80">{t("metric_delay_sub")}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Realistic Doctor Photography with Floating Badges */}
              <div className="lg:col-span-5 flex justify-center lg:justify-end">
                <div className="relative w-full max-w-md">
                  <div className="relative h-96 sm:h-[420px] w-full overflow-hidden rounded-[2.2rem] border-2 border-white/25 shadow-2xl bg-teal-900/40">
                    <img
                      src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=800"
                      alt="Attending Physician"
                      className="h-full w-full object-cover object-top"
                      loading="lazy"
                    />
                    {/* Gradient Depth Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-teal-950/70 via-transparent to-transparent pointer-events-none" />

                    {/* Floating Glass Badge 1 (Top Left) */}
                    <div className="absolute top-4 left-4 backdrop-blur-md bg-white/90 border border-white/40 shadow-lg text-slate-800 text-xs font-semibold py-2 px-3.5 rounded-full flex items-center gap-1.5">
                      <span>{t("badge_ai_review")}</span>
                    </div>

                    {/* Floating Glass Badge 2 (Bottom Right) */}
                    <div className="absolute bottom-4 right-4 backdrop-blur-md bg-white/90 border border-white/40 shadow-lg text-slate-800 text-xs font-semibold py-2 px-3.5 rounded-full flex items-center gap-1.5">
                      <span>{t("badge_on_duty")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 7 CORE PILLARS OF MEDIBRIDGE AI                         */}
        {/* ======================================================== */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="inline-flex items-center rounded-full bg-teal-50 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#00A896] border border-teal-100">
                End-To-End Clinical Architecture
              </span>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                7 Pillars of MediBridge AI
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
                Engineered with high clinical aesthetic standards for modern hospitals, medical centers, and outpatient clinics.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {coreFeatures.map((f) => (
                <Link
                  key={f.title}
                  href={f.link}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-7 shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-600/10"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-3xl shadow-inner transition-transform duration-300 group-hover:scale-110">
                        {f.icon}
                      </div>
                      <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 transition-colors group-hover:bg-teal-50 group-hover:text-teal-700">
                        {f.badge}
                      </span>
                    </div>

                    <h3 className="mt-6 text-xl font-bold text-slate-900 transition-colors group-hover:text-[#00A896]">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {f.desc}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-[#00A896] transition-all duration-200 group-hover:gap-2.5">
                    <span>Explore module</span>
                    <span>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3-STEP CLINICAL INTAKE TIMELINE                          */}
        {/* ======================================================== */}
        <section className="border-t border-slate-100 bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-extrabold text-[#00A896]">
                {t("steps_badge")}
              </span>
              <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
                {t("steps_heading")}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {t("steps_sub")}
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <div className="rounded-[2rem] border border-slate-100 bg-[#F8FAFC] p-6 shadow-sm transition hover:shadow-md">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-black text-sm">
                  1
                </span>
                <h4 className="mt-4 text-base font-bold text-slate-900">{t("step1_title")}</h4>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  {t("step1_desc")}
                </p>
              </div>

              <div className="rounded-[2rem] border border-slate-100 bg-[#F8FAFC] p-6 shadow-sm transition hover:shadow-md">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-black text-sm">
                  2
                </span>
                <h4 className="mt-4 text-base font-bold text-slate-900">{t("step2_title")}</h4>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  {t("step2_desc")}
                </p>
              </div>

              <div className="rounded-[2rem] border border-slate-100 bg-[#F8FAFC] p-6 shadow-sm transition hover:shadow-md">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-black text-sm">
                  3
                </span>
                <h4 className="mt-4 text-base font-bold text-slate-900">{t("step3_title")}</h4>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  {t("step3_desc")}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Emergency Modal Instance */}
      <EmergencyModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2">
            <span className="text-base font-black tracking-tight text-slate-900">MediBridge</span>
            <span className="rounded-full bg-gradient-to-r from-[#00A896] to-[#028090] px-2 py-0.5 text-xs font-black text-white">
              AI
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Clinical AI Platform for Modern Healthcare Providers. Powered by Next.js 16, Supabase, Cloudinary & xAI Grok.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Notice: MediBridge AI assists clinical decision workflows and does not replace professional medical judgment.
          </p>
        </div>
      </footer>
    </div>
  );
}
