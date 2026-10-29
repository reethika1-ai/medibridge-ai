"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import EmergencyModal from "@/components/EmergencyModal";
import { useLanguage } from "@/context/LanguageContext";

type AppointmentRecord = {
  token: string;
  patient_name: string;
  department: string;
  appointment_date: string;
  symptoms: string | null;
  summary: string | null;
  urgent: boolean;
  prescription_url?: string | null;
  report_url?: string | null;
  document_url?: string | null;
  report_public_id: string | null;
  created_at: string;
  status?: string;
  parsed_summary?: {
    status?: string;
    prescription_url?: string | null;
    report_url?: string | null;
    document_url?: string | null;
  } | null;
};

function PatientDashboardContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token");

  const [activeToken, setActiveToken] = useState<string>("");
  const [tokenInput, setTokenInput] = useState<string>("");
  const [appointment, setAppointment] = useState<AppointmentRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [previewDocModal, setPreviewDocModal] = useState<string | null>(null);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState<boolean>(false);
  const [docVaultTab, setDocVaultTab] = useState<"rx" | "report">("rx");

  useEffect(() => {
    const savedToken =
      tokenParam ||
      (typeof window !== "undefined" ? localStorage.getItem("medibridge_last_token") : null);
    if (savedToken) {
      setActiveToken(savedToken);
      setTokenInput(savedToken);
      fetchAppointment(savedToken);
    }
  }, [tokenParam]);

  async function fetchAppointment(tok: string) {
    if (!tok.trim()) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/appointments?token=${encodeURIComponent(tok.trim())}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Appointment not found");
      }

      const appt = json.appointment;
      setAppointment(appt);
      setActiveToken(tok.trim());

      if (typeof window !== "undefined") {
        localStorage.setItem("medibridge_last_token", tok.trim());
      }
    } catch (err: any) {
      console.error("Error fetching patient appointment:", err);
      setErrorMsg(err.message || "Failed to retrieve appointment details. Please check the token.");
      setAppointment(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (tokenInput.trim()) {
      fetchAppointment(tokenInput.trim());
    }
  }

  function handleCopy(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Safe file extraction for patient preview
  const rxUrl =
    appointment?.prescription_url ||
    appointment?.parsed_summary?.prescription_url ||
    null;

  const reportUrl =
    appointment?.report_url ||
    appointment?.parsed_summary?.report_url ||
    (appointment?.report_public_id
      ? `https://res.cloudinary.com/igssaucs/image/upload/${appointment.report_public_id}`
      : appointment?.document_url || appointment?.parsed_summary?.document_url || null);

  const currentStatus = appointment?.status || "Waiting";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between selection:bg-[#00A896] selection:text-white">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* ======================================================== */}
        {/* REPASSE CURVED SEA-TEAL HERO CANVAS                     */}
        {/* ======================================================== */}
        <section className="relative overflow-hidden rounded-[2.2rem] bg-gradient-to-r from-[#00A896] via-[#028090] to-[#02C39A] p-7 sm:p-10 lg:p-12 text-white shadow-xl shadow-teal-900/10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute left-1/3 -bottom-24 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Intake details & actions */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-bold text-teal-50 backdrop-blur-md border border-white/20">
                <span className="flex h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
                <span>✨ {t("hero_tag")}</span>
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl text-white leading-tight">
                {t("hero_title")}{" "}
                <span className="text-amber-300">{t("hero_title_highlight")}</span>
              </h1>
              <p className="mt-3 max-w-xl text-teal-50/90 text-sm sm:text-base leading-relaxed">
                {t("hero_subtitle")}
              </p>

              {/* Action Pills */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/appointment"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-xs sm:text-sm font-extrabold text-[#028090] shadow-md transition-all duration-300 hover:scale-105 hover:bg-teal-50 hover:shadow-lg active:scale-95"
                >
                  <span>🗓️</span>
                  <span>{t("btn_book_consultation")}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setEmergencyModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-500 hover:bg-rose-600 px-6 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-rose-500/30 transition-all duration-300 hover:scale-105 active:scale-95 animate-pulse"
                >
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  <span>🚨 {t("navbar_emergency_sos")}</span>
                </button>
              </div>

              {/* Metric Strip */}
              <div className="mt-8 grid grid-cols-3 gap-3 border-t border-white/20 pt-6">
                <div>
                  <span className="text-[11px] font-semibold text-teal-100 uppercase tracking-wider">
                    {t("metric_dispatch")}
                  </span>
                  <p className="mt-0.5 text-lg sm:text-xl font-black text-white">{t("metric_dispatch_val")}</p>
                  <span className="text-[10px] text-teal-100/80">{t("metric_dispatch_sub")}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-teal-100 uppercase tracking-wider">
                    {t("metric_accuracy")}
                  </span>
                  <p className="mt-0.5 text-lg sm:text-xl font-black text-white">{t("metric_accuracy_val")}</p>
                  <span className="text-[10px] text-teal-100/80">{t("metric_accuracy_sub")}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-teal-100 uppercase tracking-wider">
                    {t("metric_delay")}
                  </span>
                  <p className="mt-0.5 text-lg sm:text-xl font-black text-white">{t("metric_delay_val")}</p>
                  <span className="text-[10px] text-teal-100/80">{t("metric_delay_sub")}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Realistic Doctor Photography with Floating Badges */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-sm">
                <div className="relative h-80 sm:h-96 w-full overflow-hidden rounded-[2rem] border-2 border-white/20 shadow-2xl bg-teal-900/30">
                  <img
                    src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=800"
                    alt="Attending Physician"
                    className="h-full w-full object-cover object-top"
                    loading="lazy"
                  />
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-teal-950/60 via-transparent to-transparent pointer-events-none" />

                  {/* Floating Glass Badge 1 (Top Left) */}
                  <div className="absolute top-4 left-4 backdrop-blur-md bg-white/90 border border-white/40 shadow-lg text-slate-800 text-xs font-semibold py-1.5 px-3 rounded-full flex items-center gap-1.5">
                    <span>{t("badge_ai_review")}</span>
                  </div>

                  {/* Floating Glass Badge 2 (Bottom Right) */}
                  <div className="absolute bottom-4 right-4 backdrop-blur-md bg-white/90 border border-white/40 shadow-lg text-slate-800 text-xs font-semibold py-1.5 px-3 rounded-full flex items-center gap-1.5">
                    <span>{t("badge_on_duty")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* CARD 1: TRIAGE VITALS & WAITING STATUS                   */}
        {/* ======================================================== */}
        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-[2rem] bg-white border border-slate-100 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-[#00A896]">
                  {t("tag_vitals")}
                </span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-900">
                {t("queue_vitals_heading")}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {appointment ? `${appointment.department} Consultation Wing` : t("queue_vitals_sub")}
              </p>

              <div className="mt-4 rounded-2xl bg-teal-50/60 border border-teal-100 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⏱️</span>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">
                      {currentStatus === "Completed"
                        ? t("visit_completed")
                        : currentStatus === "In-Consultation"
                        ? t("inConsultation")
                        : "2 Patients Ahead (~10 min ETA)"}
                    </p>
                    <p className="text-[11px] text-teal-800 font-medium">
                      {t("visit_automated")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-500">Fleet Response:</span>
                  <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                    {t("ambulance_standby")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500">ER Mobilization:</span>
                  <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                    {t("gate_ready")}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <Link
                href="/appointment"
                className="block text-center rounded-full bg-slate-50 hover:bg-teal-50 py-2.5 text-xs font-bold text-[#028090] transition"
              >
                Schedule Follow-up Visit →
              </Link>
            </div>
          </div>

          {/* Quick Card 2: Document Vault Overview */}
          <div className="rounded-[2rem] bg-white border border-slate-100 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  {t("tag_doc_intel")}
                </span>
                <span className="text-sm">📄</span>
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-900">
                {t("vault_heading")}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {t("vault_sub")}
              </p>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>💊</span>
                    <span className="font-bold text-slate-700">{t("prescription_ingest")}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600">
                    {rxUrl ? t("attached_verified") : "Ready for Upload"}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>🩻</span>
                    <span className="font-bold text-slate-700">{t("radiology_scan")}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600">
                    {reportUrl ? t("attached_verified") : "Ready for Upload"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <Link
                href={activeToken ? `/patient-details?token=${encodeURIComponent(activeToken)}` : "/patient-details"}
                className="block text-center rounded-full bg-slate-50 hover:bg-indigo-50 py-2.5 text-xs font-bold text-indigo-700 transition"
              >
                {t("btn_manage_docs")}
              </Link>
            </div>
          </div>

          {/* Quick Card 3: Patient Guidelines & Arrival Policy */}
          <div className="rounded-[2rem] bg-white border border-slate-100 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  {t("tag_protocol")}
                </span>
                <span className="text-sm">🏥</span>
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-900">
                {t("protocol_heading")}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {t("protocol_sub")}
              </p>

              <div className="mt-4 rounded-2xl bg-amber-50/60 border border-amber-100 p-3.5 text-xs text-amber-900 leading-relaxed">
                {t("protocol_box")}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <Link
                href="/appointment"
                className="block text-center rounded-full bg-slate-50 hover:bg-amber-50 py-2.5 text-xs font-bold text-amber-800 transition"
              >
                {t("btn_dept_guide")}
              </Link>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* LIVE TOKEN TRACKER & ACTIVE CONSULTATION ELEVATION      */}
        {/* ======================================================== */}
        <section className="mt-10 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#00A896]">
                {t("realTimeSynchronized")}
              </span>
              <h2 className="text-2xl font-black text-slate-900">{t("tokenTrackerTitle")}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {t("tokenTrackerSubtitle")}
              </p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder={t("tokenInputPlaceholder")}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-48 sm:w-60 rounded-full border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 outline-none transition focus:border-[#00A896] focus:bg-white focus:ring-2 focus:ring-teal-100"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-gradient-to-r from-[#00A896] to-[#028090] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {loading ? t("tokenChecking") : t("trackTokenBtn")}
              </button>
            </form>
          </div>

          {errorMsg && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">
              {errorMsg}
            </div>
          )}

          {/* Active Patient Appointment View */}
          {appointment ? (
            <div className="mt-8 grid gap-8 lg:grid-cols-12">
              {/* CARD 2: DIGITAL INTAKE TOKEN PASS (BOARDING PASS FORMAT) */}
              <div className="lg:col-span-5 flex flex-col justify-between relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#00A896] via-[#028090] to-[#02C39A] p-6 sm:p-7 text-white shadow-xl shadow-teal-900/15">
                <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
                      {t("officialClinicToken")}
                    </span>
                    <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-xs">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                      </span>
                      <span>{t("liveStatusSync")}</span>
                    </div>
                  </div>

                  {/* Token Number & Boarding Pass Styling */}
                  <div className="mt-6 rounded-2xl bg-white/10 p-4 backdrop-blur-xs border border-white/20">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-teal-100">
                      CLINICAL INTAKE PASS
                    </span>
                    <p className="font-mono text-3xl sm:text-4xl font-black tracking-wider text-white mt-1">
                      {appointment.token}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <button
                        onClick={() => handleCopy(appointment.token)}
                        className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/30"
                      >
                        {copied ? t("copiedToClipboard") : t("copyTokenBtn")}
                      </button>
                      {/* Simulated Barcode */}
                      <div className="flex items-center gap-0.5 opacity-60">
                        <span className="w-0.5 h-6 bg-white" />
                        <span className="w-1 h-6 bg-white" />
                        <span className="w-0.5 h-6 bg-white" />
                        <span className="w-1.5 h-6 bg-white" />
                        <span className="w-0.5 h-6 bg-white" />
                        <span className="w-1 h-6 bg-white" />
                        <span className="w-0.5 h-6 bg-white" />
                      </div>
                    </div>
                  </div>

                  {/* 3-Stage Progress Stepper */}
                  <div className="mt-6 rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs border border-white/15">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <div className="flex flex-col items-center">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-teal-950 font-black text-[10px]">
                          ✓
                        </span>
                        <span className="mt-1 text-white">(1) Checked-In</span>
                      </div>
                      <span className="h-0.5 flex-1 bg-white/30 mx-2 mb-4" />
                      <div className="flex flex-col items-center">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full font-black text-[10px] ${
                          currentStatus === "In-Consultation"
                            ? "bg-amber-300 text-slate-900 animate-pulse"
                            : "bg-white/30 text-white"
                        }`}>
                          2
                        </span>
                        <span className="mt-1 text-white">(2) Triage Active</span>
                      </div>
                      <span className="h-0.5 flex-1 bg-white/30 mx-2 mb-4" />
                      <div className="flex flex-col items-center">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full font-black text-[10px] ${
                          currentStatus === "Completed"
                            ? "bg-emerald-400 text-teal-950"
                            : "bg-white/20 text-white/60"
                        }`}>
                          3
                        </span>
                        <span className="mt-1 text-white/80">(3) Visited</span>
                      </div>
                    </div>
                  </div>

                  {/* Consultation Patient Details */}
                  <div className="mt-6 space-y-2.5 border-t border-white/20 pt-5 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-teal-100">{t("patientNameLabel")}</span>
                      <span className="font-bold">{appointment.patient_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-100">{t("specialtyDoctorLabel")}</span>
                      <span className="font-bold truncate max-w-[200px]">{appointment.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-100">{t("scheduledTimeLabel")}</span>
                      <span className="font-bold">{appointment.appointment_date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-teal-100">{t("queueStatusLabel")}</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                          currentStatus === "Completed"
                            ? "bg-emerald-300 text-emerald-950"
                            : currentStatus === "In-Consultation"
                            ? "bg-amber-300 text-amber-950 animate-pulse"
                            : "bg-teal-200 text-teal-950"
                        }`}
                      >
                        {currentStatus === "Completed"
                          ? t("completed")
                          : currentStatus === "In-Consultation"
                          ? `● ${t("inConsultation")}`
                          : t("waiting")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href={`/patient-details?token=${encodeURIComponent(appointment.token)}`}
                    className="block w-full rounded-full bg-white py-3 text-center text-xs sm:text-sm font-extrabold text-[#028090] shadow-md transition-all hover:bg-teal-50 active:scale-98"
                  >
                    {t("updateIntakeBtn")}
                  </Link>
                </div>
              </div>

              {/* CARD 3: MEDICAL DOCUMENT VAULT (TABBED PORCELAIN CARD) */}
              <div className="lg:col-span-7 flex flex-col justify-between rounded-[2rem] border border-slate-100 bg-white p-6 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {t("attachedDocuments")}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {t("vaultSubtitle")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-slate-100 p-1 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setDocVaultTab("rx")}
                        className={`rounded-full px-3 py-1 transition ${
                          docVaultTab === "rx" ? "bg-white text-teal-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {t("rx_title")} ({rxUrl ? 1 : 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocVaultTab("report")}
                        className={`rounded-full px-3 py-1 transition ${
                          docVaultTab === "report" ? "bg-white text-teal-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {t("reports_title")} ({reportUrl ? 1 : 0})
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {docVaultTab === "rx" ? (
                      rxUrl ? (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-teal-100 bg-teal-50/50 p-4 transition-all hover:bg-teal-50">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-xl text-teal-700 shadow-inner">
                              📄
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                {t("attachedPrescription")}
                              </p>
                              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {t("encryptedVerified")} · Sarvam AI
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPreviewDocModal(rxUrl)}
                              className="rounded-full bg-[#00A896] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#028090]"
                            >
                              [ {t("preview")} ]
                            </button>
                            <a
                              href={rxUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                            >
                              [ {t("download")} ]
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <span>{t("noRxAttached")}</span>
                          <Link
                            href={`/patient-details?token=${encodeURIComponent(appointment.token)}`}
                            className="rounded-full bg-teal-50 px-4 py-2 font-bold text-[#028090] hover:bg-teal-100 transition"
                          >
                            + {t("attachRxBtn")}
                          </Link>
                        </div>
                      )
                    ) : (
                      reportUrl ? (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-teal-100 bg-teal-50/50 p-4 transition-all hover:bg-teal-50">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-xl text-teal-700 shadow-inner">
                              🩻
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                {t("attachedReport")}
                              </p>
                              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {t("encryptedVerified")} · Grok Vision
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPreviewDocModal(reportUrl)}
                              className="rounded-full bg-[#00A896] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#028090]"
                            >
                              [ {t("preview")} ]
                            </button>
                            <a
                              href={reportUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                            >
                              [ {t("download")} ]
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <span>{t("noReportAttached")}</span>
                          <Link
                            href={`/patient-details?token=${encodeURIComponent(appointment.token)}`}
                            className="rounded-full bg-teal-50 px-4 py-2 font-bold text-[#028090] hover:bg-teal-100 transition"
                          >
                            + {t("attachReportBtn")}
                          </Link>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="mt-8 rounded-2xl bg-teal-50/50 p-4 border border-teal-100/60 text-xs text-slate-600">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span>🏥</span>
                    <span>{t("clinicPatientNotice")}</span>
                  </div>
                  <p className="mt-1 leading-relaxed text-[11px] text-slate-600">
                    {t("clinicNotice")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
              <span className="text-4xl">🎟️</span>
              <h3 className="mt-3 text-base font-bold text-slate-900">{t("noActiveTokenTitle")}</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                {t("noActiveTokenDesc")}
              </p>
              <div className="mt-5">
                <Link
                  href="/appointment"
                  className="rounded-full bg-gradient-to-r from-[#00A896] to-[#028090] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:scale-105 active:scale-95"
                >
                  {t("bookNewAppointmentNow")}
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* ======================================================== */}
        {/* BOTTOM SECTION: 3 SIMPLE STEPS TO CLINICAL INTAKE        */}
        {/* ======================================================== */}
        <section className="mt-10 rounded-[2rem] border border-slate-100 bg-white p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <div className="text-center max-w-2xl mx-auto">
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-extrabold text-[#00A896]">
              {t("steps_badge")}
            </span>
            <h3 className="mt-2 text-xl sm:text-2xl font-black text-slate-900">
              {t("steps_heading")}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              {t("steps_sub")}
            </p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-black text-sm">
                1
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-900">
                {t("step1_title")}
              </h4>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {t("step1_desc")}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-black text-sm">
                2
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-900">
                {t("step2_title")}
              </h4>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {t("step2_desc")}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-black text-sm">
                3
              </div>
              <h4 className="mt-3 text-sm font-bold text-slate-900">
                {t("step3_title")}
              </h4>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {t("step3_desc")}
              </p>
            </div>
          </div>
        </section>

        {/* Modal Quick Preview for Attached Document */}
        {previewDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <h3 className="text-sm font-bold text-slate-900">{t("docVaultViewer")}</h3>
                <button
                  onClick={() => setPreviewDocModal(null)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              <div className="h-[70vh] bg-slate-50 p-4 flex items-center justify-center">
                <iframe
                  src={previewDocModal}
                  className="h-full w-full rounded-2xl border border-slate-200"
                  title="Document Preview"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Emergency Modal Instance for Hero SOS */}
      <EmergencyModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
      />

      <footer className="border-t border-slate-100 bg-white py-6 text-center text-xs text-slate-500">
        MediBridge AI · Confidential Patient Health Information Portal
      </footer>
    </div>
  );
}

export default function PatientDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-xs font-semibold">Loading Patient Health Dashboard...</p>
        </div>
      }
    >
      <PatientDashboardContent />
    </Suspense>
  );
}
