"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

type AppointmentRecord = {
  token: string;
  patient_name: string;
  department: string;
  appointment_date: string;
  symptoms: string | null;
  summary: string | null;
  urgent: boolean;
  report_public_id: string | null;
  created_at: string;
  status?: string;
  parsed_summary?: {
    chief_complaint?: string;
    key_information?: string[];
    summary?: string;
    urgent_flag?: boolean;
    status?: string;
  } | null;
};

function PatientDashboardContent() {
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

      if (!res.ok || !json.ok || !json.data || json.data.length === 0) {
        setAppointment(null);
        setErrorMsg("No appointment record found for token: " + tok);
      } else {
        const item = json.data[0];
        setAppointment(item);
        if (typeof window !== "undefined") {
          localStorage.setItem("medibridge_last_token", item.token);
        }
      }
    } catch {
      setErrorMsg("Failed to communicate with appointment service.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (tokenInput.trim()) {
      setActiveToken(tokenInput.trim());
      fetchAppointment(tokenInput.trim());
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
                Live Patient Care Portal
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Patient Health Dashboard
              </h1>
              <p className="mt-2 max-w-xl text-blue-100 text-sm sm:text-base leading-relaxed">
                Review your real-time clinic queue status, manage attached medical reports in the Cloudinary vault, and inspect Grok AI intake summaries.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/appointment"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-blue-900 shadow-md transition-all duration-300 hover:scale-105 hover:bg-blue-50 hover:shadow-lg active:scale-95"
              >
                <span>+ Book New Visit</span>
              </Link>
              <Link
                href={
                  activeToken
                    ? `/patient-details?token=${encodeURIComponent(activeToken)}`
                    : "/patient-details"
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/20 active:scale-95"
              >
                <span>Upload Reports</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Actions Interactive Grid (Bounces on hover) */}
        <section className="mt-8 grid gap-6 sm:grid-cols-3">
          <Link
            href="/appointment"
            className="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600 transition-transform duration-300 group-hover:scale-110">
              🗓️
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900 transition-colors group-hover:text-blue-600">
              Schedule Consultation
            </h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Book with Cardiology, Dermatology, Neurology, Orthopedics, Pediatrics, or General Medicine.
            </p>
            <div className="mt-4 flex items-center text-xs font-bold text-blue-600 group-hover:underline">
              Book appointment →
            </div>
          </Link>

          <Link
            href={
              activeToken
                ? `/patient-details?token=${encodeURIComponent(activeToken)}`
                : "/patient-details"
            }
            className="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600 transition-transform duration-300 group-hover:scale-110">
              📄
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900 transition-colors group-hover:text-indigo-600">
              Cloudinary Vault Upload
            </h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Attach PDF lab reports or prescription photos and generate AI intake summaries.
            </p>
            <div className="mt-4 flex items-center text-xs font-bold text-indigo-600 group-hover:underline">
              Open document intake →
            </div>
          </Link>

          <Link
            href="/doctor"
            className="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-300 hover:shadow-xl hover:shadow-cyan-500/10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-2xl text-cyan-600 transition-transform duration-300 group-hover:scale-110">
              🩺
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900 transition-colors group-hover:text-cyan-600">
              Physician Live Board
            </h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Staff queue with automated clinical urgency sorting and status toggle switches.
            </p>
            <div className="mt-4 flex items-center text-xs font-bold text-cyan-600 group-hover:underline">
              Access doctor board →
            </div>
          </Link>
        </section>

        {/* Live Token Tracker & Active Consultation Elevation */}
        <section className="mt-10 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-lg shadow-slate-200/40 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-600">
                Real-Time Synchronized
              </span>
              <h2 className="text-2xl font-black text-slate-900">Active Token Tracker</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Track your consultation token or enter an appointment ID to view live status.
              </p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Token (e.g. MB-743721)"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-48 sm:w-60 rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95 disabled:opacity-50"
              >
                {loading ? "Checking..." : "Track Token"}
              </button>
            </form>
          </div>

          {errorMsg && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">
              {errorMsg}
            </div>
          )}

          {/* Active Appointment Live State */}
          {appointment ? (
            <div className="mt-8 grid gap-8 lg:grid-cols-12">
              {/* Token Card Micro-Interactions: Elevated Gradient Card */}
              <div className="lg:col-span-4 flex flex-col justify-between relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 sm:p-7 text-white shadow-xl shadow-blue-600/20">
                {/* Background accent circles */}
                <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
                      Official Clinic Token
                    </span>
                    {/* Breath status beacon */}
                    <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-xs">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                      </span>
                      <span>Active · Position #2</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="font-mono text-4xl sm:text-5xl font-black tracking-wider text-white">
                      {appointment.token}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(appointment.token)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-white/30"
                      >
                        {copied ? "✓ Copied to clipboard" : "📋 Copy Token"}
                      </button>
                      {appointment.urgent && (
                        <span className="rounded-full bg-rose-500/90 px-2.5 py-0.5 text-xs font-black text-white animate-pulse">
                          Urgent Priority
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 space-y-2.5 border-t border-white/20 pt-6 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-100">Patient:</span>
                      <span className="font-bold">{appointment.patient_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-100">Department:</span>
                      <span className="font-bold">{appointment.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-100">Scheduled:</span>
                      <span className="font-bold">{appointment.appointment_date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-100">Queue Status:</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                          appointment.status === "Completed"
                            ? "bg-emerald-400 text-emerald-950"
                            : "bg-amber-300 text-amber-950"
                        }`}
                      >
                        {appointment.status || "Waiting"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <Link
                    href={`/patient-details?token=${encodeURIComponent(appointment.token)}`}
                    className="block w-full rounded-2xl bg-white py-3 text-center text-xs sm:text-sm font-extrabold text-blue-900 shadow-md transition-all hover:bg-blue-50 active:scale-98"
                  >
                    Update Symptoms & Reports →
                  </Link>
                </div>
              </div>

              {/* Right: Grok AI Intake & Cloudinary Vault Preview */}
              <div className="lg:col-span-8 space-y-6">
                {/* Grok AI Intake Card */}
                <div className="rounded-3xl border border-blue-100 bg-gradient-to-tr from-white via-blue-50/30 to-indigo-50/20 p-6 sm:p-7 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100/80 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg text-white shadow-xs">
                        🤖
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          xAI Grok Intake Assessment
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Automated clinical triage synthesis
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                      Physician Review Ready
                    </span>
                  </div>

                  {appointment.parsed_summary ? (
                    <div className="mt-5 space-y-4">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                          Chief Complaint
                        </span>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {appointment.parsed_summary.chief_complaint || "None recorded"}
                        </p>
                      </div>

                      {appointment.parsed_summary.key_information &&
                        appointment.parsed_summary.key_information.length > 0 && (
                          <div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                              Key Clinical Observations
                            </span>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {appointment.parsed_summary.key_information.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center rounded-xl border border-blue-200/80 bg-blue-50/70 px-3 py-1 text-xs font-medium text-blue-900"
                                >
                                  • {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                          Clinical Synthesis Narrative
                        </span>
                        <p className="mt-1 text-xs text-slate-700 leading-relaxed bg-white/70 p-3.5 rounded-2xl border border-slate-100">
                          {appointment.parsed_summary.summary}
                        </p>
                      </div>
                    </div>
                  ) : appointment.summary ? (
                    <div className="mt-4 rounded-2xl bg-white p-4 border border-slate-100 text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                      {appointment.summary}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-blue-200 bg-white/60 p-6 text-center">
                      <p className="text-xs font-medium text-slate-600">
                        No symptoms or AI intake recorded for this appointment yet.
                      </p>
                      <Link
                        href={`/patient-details?token=${encodeURIComponent(appointment.token)}`}
                        className="mt-2 inline-block text-xs font-bold text-blue-600 hover:underline"
                      >
                        Provide your symptoms now →
                      </Link>
                    </div>
                  )}
                </div>

                {/* Cloudinary Document Vault Section */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Attached Clinical Documents
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Cloudinary Encrypted Storage Vault
                      </p>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                      Multi-format
                    </span>
                  </div>

                  {appointment.report_public_id ? (
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 transition-all hover:bg-slate-100/60">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl text-blue-700 shadow-inner">
                          📑
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            Medical Document Attached
                          </p>
                          <p className="text-xs font-mono text-slate-500">
                            Vault ID: {appointment.report_public_id}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setPreviewDocModal(
                              `https://res.cloudinary.com/igssaucs/image/upload/${appointment.report_public_id}`
                            )
                          }
                          className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                        >
                          Quick Preview
                        </button>
                        <a
                          href={`https://res.cloudinary.com/igssaucs/image/upload/${appointment.report_public_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Open Direct ↗
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                      <div className="text-3xl">📁</div>
                      <p className="mt-2 text-xs font-medium text-slate-500">
                        No medical reports or prescriptions attached yet.
                      </p>
                      <Link
                        href={`/patient-details?token=${encodeURIComponent(appointment.token)}`}
                        className="mt-2 inline-block text-xs font-bold text-blue-600 hover:underline"
                      >
                        Upload lab results or prescriptions →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
              <span className="text-4xl">🎟️</span>
              <h3 className="mt-3 text-base font-bold text-slate-900">No Active Token Loaded</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                Enter your appointment token above to monitor your consultation position, or book a new appointment to generate one.
              </p>
              <div className="mt-5">
                <Link
                  href="/appointment"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Book New Appointment Now
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
                <h3 className="text-sm font-bold text-slate-900">Document Vault Viewer</h3>
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
