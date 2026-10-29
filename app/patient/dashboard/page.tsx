"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/20 to-slate-50 text-slate-900 flex flex-col justify-between">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
        {/* Welcome Header */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-7 sm:p-10 text-white shadow-xl shadow-blue-900/15">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-blue-200 backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                {t("livePatientCarePortal")}
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                {t("dashboardTitle")}
              </h1>
              <p className="mt-2 max-w-xl text-blue-100 text-sm sm:text-base leading-relaxed">
                {t("dashboardSubtitle")}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/appointment"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-blue-900 shadow-md transition-all duration-300 hover:scale-105 hover:bg-blue-50 hover:shadow-lg active:scale-95"
              >
                <span>{t("bookNewVisit")}</span>
              </Link>
              <Link
                href={
                  activeToken
                    ? `/patient-details?token=${encodeURIComponent(activeToken)}`
                    : "/patient-details"
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/20 active:scale-95"
              >
                <span>{t("uploadRecords")}</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Actions Interactive Grid */}
        <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/appointment"
            className="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600 transition-transform duration-300 group-hover:scale-110">
              🗓️
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900 transition-colors group-hover:text-blue-600">
              {t("scheduleConsultation")}
            </h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              {t("scheduleDesc")}
            </p>
            <div className="mt-4 flex items-center text-xs font-bold text-blue-600 group-hover:underline">
              {t("bookAppointmentAction")}
            </div>
          </Link>

          <Link
            href={
              activeToken
                ? `/patient-details?token=${encodeURIComponent(activeToken)}`
                : "/patient-details"
            }
            className="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600 transition-transform duration-300 group-hover:scale-110">
              📄
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900 transition-colors group-hover:text-indigo-600">
              {t("uploadMoreRecords")}
            </h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              {t("uploadMoreDesc")}
            </p>
            <div className="mt-4 flex items-center text-xs font-bold text-indigo-600 group-hover:underline">
              {t("openDocUpload")}
            </div>
          </Link>

          <Link
            href="/appointment"
            className="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-500/10 sm:col-span-2 lg:col-span-1"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-2xl text-cyan-600 transition-transform duration-300 group-hover:scale-110">
              🏥
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900 transition-colors group-hover:text-cyan-600">
              {t("clinicGuidelines")}
            </h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              {t("clinicGuidelinesDesc")}
            </p>
            <div className="mt-4 flex items-center text-xs font-bold text-cyan-600 group-hover:underline">
              {t("clinicArrivalPolicy")}
            </div>
          </Link>
        </section>

        {/* Live Token Tracker & Active Consultation Elevation */}
        <section className="mt-10 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-lg shadow-slate-200/40 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-600">
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
                className="w-48 sm:w-60 rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
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

          {/* Active Patient Appointment View: STRICT SEPARATION (NO INTERNAL DOCTOR SUMMARIES) */}
          {appointment ? (
            <div className="mt-8 grid gap-8 lg:grid-cols-12">
              {/* 1. DIGITAL QUEUE CARD */}
              <div className="lg:col-span-5 flex flex-col justify-between relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 sm:p-7 text-white shadow-xl shadow-blue-600/20">
                <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
                      {t("officialClinicToken")}
                    </span>
                    <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-xs">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                      </span>
                      <span>{t("liveStatusSync")}</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="font-mono text-4xl sm:text-5xl font-black tracking-wider text-white">
                      {appointment.token}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(appointment.token)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-white/30"
                      >
                        {copied ? t("copiedToClipboard") : t("copyTokenBtn")}
                      </button>
                    </div>
                  </div>

                  {/* Consultation Patient Details */}
                  <div className="mt-7 space-y-2.5 border-t border-white/20 pt-5 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-100">{t("patientNameLabel")}</span>
                      <span className="font-bold">{appointment.patient_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-100">{t("specialtyDoctorLabel")}</span>
                      <span className="font-bold truncate max-w-[200px]">{appointment.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-100">{t("scheduledTimeLabel")}</span>
                      <span className="font-bold">{appointment.appointment_date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-100">{t("queueStatusLabel")}</span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                          currentStatus === "Completed"
                            ? "bg-emerald-400 text-emerald-950"
                            : currentStatus === "In-Consultation"
                            ? "bg-cyan-300 text-cyan-950 animate-pulse"
                            : "bg-amber-300 text-amber-950"
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

                  {/* Estimated Queue Position / Wait Time Notice */}
                  <div className="mt-5 rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs border border-white/15 text-xs">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span className="text-base">⏱️</span>
                      <span>
                        {currentStatus === "Completed"
                          ? t("waitCompleted")
                          : currentStatus === "In-Consultation"
                          ? t("waitInConsultation")
                          : t("waitEstimated")}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-blue-100">
                      {currentStatus === "Completed"
                        ? t("waitCompletedDesc")
                        : currentStatus === "In-Consultation"
                        ? t("waitInConsultationDesc")
                        : t("waitEstimatedDesc")}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href={`/patient-details?token=${encodeURIComponent(appointment.token)}`}
                    className="block w-full rounded-2xl bg-white py-3 text-center text-xs sm:text-sm font-extrabold text-blue-900 shadow-md transition-all hover:bg-blue-50 active:scale-98"
                  >
                    {t("updateIntakeBtn")}
                  </Link>
                </div>
              </div>

              {/* 2. ATTACHED DOCUMENTS CONFIRMATION (PATIENT-ONLY: ZERO CLINICAL NOTES) */}
              <div className="lg:col-span-7 flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {t("attachedDocuments")}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {t("vaultSubtitle")}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {t("patientVaultBadge")}
                    </span>
                  </div>

                  <div className="mt-5 space-y-4">
                    {/* Attached Prescription Confirmation */}
                    {rxUrl ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 transition-all hover:bg-slate-100/60">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-xl text-blue-700 shadow-inner">
                            📄
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {t("attachedPrescription")}
                            </p>
                            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {t("encryptedVerified")}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewDocModal(rxUrl)}
                            className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                          >
                            {t("preview")}
                          </button>
                          <a
                            href={rxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            {t("download")}
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400 flex items-center justify-between">
                        <span>{t("noRxAttached")}</span>
                        <Link
                          href={`/patient-details?token=${encodeURIComponent(appointment.token)}`}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          {t("attachRxBtn")}
                        </Link>
                      </div>
                    )}

                    {/* Attached Diagnostic Report Confirmation */}
                    {reportUrl ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 transition-all hover:bg-slate-100/60">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-xl text-indigo-700 shadow-inner">
                            🩻
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {t("attachedReport")}
                            </p>
                            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {t("encryptedVerified")}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewDocModal(reportUrl)}
                            className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
                          >
                            {t("preview")}
                          </button>
                          <a
                            href={reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            {t("download")}
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400 flex items-center justify-between">
                        <span>{t("noReportAttached")}</span>
                        <Link
                          href={`/patient-details?token=${encodeURIComponent(appointment.token)}`}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          {t("attachReportBtn")}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 rounded-2xl bg-slate-50 p-4 border border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span>🏥</span>
                    <span>{t("clinicPatientNotice")}</span>
                  </div>
                  <p className="mt-1 leading-relaxed text-[11px] text-slate-500">
                    {t("clinicNotice")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
              <span className="text-4xl">🎟️</span>
              <h3 className="mt-3 text-base font-bold text-slate-900">{t("noActiveTokenTitle")}</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                {t("noActiveTokenDesc")}
              </p>
              <div className="mt-5">
                <Link
                  href="/appointment"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
                >
                  {t("bookNewAppointmentNow")}
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Modal Quick Preview for Attached Document */}
        {previewDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <h3 className="text-sm font-bold text-slate-900">{t("docVaultViewer")}</h3>
                <button
                  onClick={() => setPreviewDocModal(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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

      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
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
