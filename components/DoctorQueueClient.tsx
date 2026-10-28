"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ExtractedMedication = {
  name: string;
  dosage?: string;
  frequency?: string;
};

export type AppointmentItem = {
  token: string;
  patient_name: string;
  age?: number | string | null;
  gender?: string | null;
  phone?: string | null;
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
    clinical_observations?: string;
    extracted_medications?: ExtractedMedication[] | string[];
    diagnostic_findings?: string;
    urgency_level?: "Normal" | "Urgent" | string;
    urgency_flags?: string[];
    chief_complaint?: string;
    key_information?: string[];
    summary?: string;
    urgent_flag?: boolean;
    status?: string;
    prescription_url?: string | null;
    report_url?: string | null;
    document_url?: string | null;
  } | null;
};

export default function DoctorQueueClient({
  initialAppointments,
}: {
  initialAppointments: AppointmentItem[];
}) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentItem[]>(initialAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);
  const [updatingToken, setUpdatingToken] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "urgent" | "waiting" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  async function handleToggleStatus(token: string, currentStatus: string) {
    const newStatus = currentStatus === "Completed" ? "Waiting" : "Completed";
    setUpdatingToken(token);

    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, status: newStatus }),
      });

      if (res.ok) {
        setAppointments((prev) =>
          prev.map((item) =>
            item.token === token
              ? {
                  ...item,
                  status: newStatus,
                  parsed_summary: item.parsed_summary
                    ? { ...item.parsed_summary, status: newStatus }
                    : item.parsed_summary,
                }
              : item
          )
        );

        if (selectedAppointment && selectedAppointment.token === token) {
          setSelectedAppointment((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch {
      // Graceful error handling
    } finally {
      setUpdatingToken(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/doctor-login", { method: "DELETE" });
    router.push("/doctor-login");
    router.refresh();
  }

  const filteredAppointments = appointments.filter((item) => {
    const isCompleted = item.status === "Completed";
    if (filter === "urgent" && !item.urgent) return false;
    if (filter === "waiting" && isCompleted) return false;
    if (filter === "completed" && !isCompleted) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchToken = item.token.toLowerCase().includes(query);
      const matchName = item.patient_name.toLowerCase().includes(query);
      const matchDept = item.department.toLowerCase().includes(query);
      return matchToken || matchName || matchDept;
    }

    return true;
  });

  const urgentCount = appointments.filter((a) => a.urgent).length;
  const waitingCount = appointments.filter((a) => a.status !== "Completed").length;
  const completedCount = appointments.filter((a) => a.status === "Completed").length;

  // Resolve document URLs for the selected appointment
  const selectedPrescriptionUrl =
    selectedAppointment?.prescription_url ||
    selectedAppointment?.parsed_summary?.prescription_url ||
    null;

  const selectedReportUrl =
    selectedAppointment?.report_url ||
    selectedAppointment?.parsed_summary?.report_url ||
    (selectedAppointment?.report_public_id
      ? `https://res.cloudinary.com/igssaucs/image/upload/${selectedAppointment.report_public_id}`
      : selectedAppointment?.document_url || selectedAppointment?.parsed_summary?.document_url || null);

  // Normalize extracted medications array
  const rawMeds = selectedAppointment?.parsed_summary?.extracted_medications || [];
  const normalizedMeds: ExtractedMedication[] = rawMeds.map((m) => {
    if (typeof m === "string") {
      return { name: m, dosage: "As Directed", frequency: "Standard" };
    }
    return m;
  });

  return (
    <div className="space-y-6">
      {/* Top Triage Action Bar & Live Search */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Animated Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 backdrop-blur-md">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
              filter === "all"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            All Patients ({appointments.length})
          </button>

          <button
            onClick={() => setFilter("urgent")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
              filter === "urgent"
                ? "bg-rose-600 text-white shadow-md shadow-rose-500/30"
                : "text-rose-400 hover:bg-rose-950/50 hover:text-rose-300"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
            <span>High Urgency ({urgentCount})</span>
          </button>

          <button
            onClick={() => setFilter("waiting")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
              filter === "waiting"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black"
                : "text-amber-400 hover:bg-amber-950/50 hover:text-amber-300"
            }`}
          >
            Waiting Queue ({waitingCount})
          </button>

          <button
            onClick={() => setFilter("completed")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
              filter === "completed"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                : "text-emerald-400 hover:bg-emerald-950/50 hover:text-emerald-300"
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Live Search and Logout */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search token, name, dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 pl-9 pr-4 py-2 text-xs sm:text-sm font-medium text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <button
            onClick={handleLogout}
            className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 shadow-xs transition hover:bg-slate-800 hover:text-white active:scale-95"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* The Live Triage Board Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/80 shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Token & Patient</th>
                <th className="px-6 py-4">Department & Schedule</th>
                <th className="px-6 py-4">Clinical Urgency</th>
                <th className="px-6 py-4">Consultation Status</th>
                <th className="px-6 py-4">Attached Documents</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <span className="text-3xl">🩺</span>
                    <p className="mt-2 text-sm font-semibold">
                      No patient records match the current filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => {
                  const isCompleted = apt.status === "Completed";
                  const rx = apt.prescription_url || apt.parsed_summary?.prescription_url;
                  const rep =
                    apt.report_url ||
                    apt.parsed_summary?.report_url ||
                    apt.report_public_id ||
                    apt.document_url;

                  return (
                    <tr
                      key={apt.token}
                      className={`group transition-all duration-150 hover:bg-slate-800/40 ${
                        apt.urgent
                          ? "border-l-4 border-rose-500 bg-rose-950/20"
                          : "border-l-4 border-slate-800"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-black text-blue-400 group-hover:text-blue-300 transition-colors">
                            {apt.token}
                          </span>
                        </div>
                        <p className="font-bold text-white text-sm mt-0.5">
                          {apt.patient_name}
                          {apt.age ? ` (${apt.age}y${apt.gender ? ` / ${apt.gender[0]}` : ""})` : ""}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <p className="font-bold text-slate-200">{apt.department}</p>
                        <p className="text-slate-400 mt-0.5">{apt.appointment_date}</p>
                      </td>

                      <td className="px-6 py-4">
                        {apt.urgent ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-black text-rose-300 border border-rose-500/40 animate-pulse">
                            <span className="h-2 w-2 rounded-full bg-rose-400" />
                            HIGH URGENCY
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-300 border border-blue-500/20">
                            Standard
                          </span>
                        )}
                      </td>

                      {/* Interactive Toggle Switch */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleStatus(apt.token, apt.status || "Waiting")
                            }
                            disabled={updatingToken === apt.token}
                            className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isCompleted ? "bg-emerald-500" : "bg-amber-500"
                            } disabled:opacity-50`}
                            title="Toggle Waiting ⇋ Completed"
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                                isCompleted ? "translate-x-6" : "translate-x-0"
                              }`}
                            />
                          </button>
                          <span className="text-xs font-bold text-slate-200">
                            {updatingToken === apt.token
                              ? "Updating..."
                              : apt.status || "Waiting"}
                          </span>
                        </div>
                      </td>

                      {/* Multi-Document Indicators */}
                      <td className="px-6 py-4 text-xs">
                        {rx && rep ? (
                          <span className="inline-flex items-center gap-1 font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-xl border border-cyan-800/60">
                            📄 Rx + 🩻 Report
                          </span>
                        ) : rx ? (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-300 bg-blue-950/60 px-2.5 py-1 rounded-xl border border-blue-800/60">
                            📄 Rx Attached
                          </span>
                        ) : rep ? (
                          <span className="inline-flex items-center gap-1 font-bold text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded-xl border border-indigo-800/60">
                            🩻 Report Attached
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">No files</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedAppointment(apt)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-blue-500 hover:shadow-md hover:shadow-blue-500/20 active:scale-95"
                        >
                          <span>Review Intake</span>
                          <span>→</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* The Sliding Grok AI & Deep Clinical Drawer */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300">
          {/* Backdrop Click */}
          <div
            className="flex-1 cursor-pointer"
            onClick={() => setSelectedAppointment(null)}
          />

          {/* Drawer Panel */}
          <div className="relative flex h-full w-full max-w-2xl flex-col bg-slate-900 shadow-2xl border-l border-slate-800 transform translate-x-0 transition-transform duration-300 ease-in-out text-slate-100">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-800 p-6 bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xl text-white shadow-md shadow-blue-500/30">
                  🩺
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Deep Clinical Assessment & Records
                  </h3>
                  <p className="text-xs font-mono font-bold text-blue-400">
                    Token: {selectedAppointment.token} · Patient: {selectedAppointment.patient_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white"
                  title="Print Clinical Brief"
                >
                  🖨️
                </button>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Patient & Demographics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl bg-slate-950/70 p-4 border border-slate-800 text-xs">
                <div>
                  <span className="font-semibold text-slate-400">Specialty</span>
                  <p className="font-bold text-white truncate">{selectedAppointment.department}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-400">Schedule</span>
                  <p className="font-bold text-white">{selectedAppointment.appointment_date}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-400">Age / Gender</span>
                  <p className="font-bold text-white">
                    {selectedAppointment.age ? `${selectedAppointment.age} yrs` : "N/A"}{" "}
                    {selectedAppointment.gender ? `(${selectedAppointment.gender})` : ""}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-400">Phone</span>
                  <p className="font-bold text-white truncate">
                    {selectedAppointment.phone || "Not recorded"}
                  </p>
                </div>
              </div>

              {/* Status Switcher in Drawer */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-950/70 p-4 border border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-200">
                    Queue Consultation Status
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Toggle patient through clinical workflow
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleStatus(
                        selectedAppointment.token,
                        selectedAppointment.status || "Waiting"
                      )
                    }
                    className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      selectedAppointment.status === "Completed"
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        selectedAppointment.status === "Completed"
                          ? "translate-x-6"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-xs font-bold text-white">
                    {selectedAppointment.status || "Waiting"}
                  </span>
                </div>
              </div>

              {/* Urgency Notification Banner */}
              {selectedAppointment.urgent && (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-950/50 p-4 text-xs font-semibold text-rose-300">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                    <strong>HIGH CLINICAL URGENCY:</strong>
                  </div>
                  <p className="mt-1">
                    Red-flag indicators present in patient profile or symptom onset. Immediate physician review prioritized.
                  </p>
                  {selectedAppointment.parsed_summary?.urgency_flags &&
                    selectedAppointment.parsed_summary.urgency_flags.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {selectedAppointment.parsed_summary.urgency_flags.map((flag, idx) => (
                          <span
                            key={idx}
                            className="rounded-lg bg-rose-900/60 px-2 py-0.5 text-[11px] font-bold text-rose-200 border border-rose-700/60"
                          >
                            ⚠️ {flag}
                          </span>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* Patient Raw Reported Symptoms */}
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Patient Reported Symptoms
                </span>
                <p className="mt-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                  {selectedAppointment.symptoms || "No symptoms recorded by patient."}
                </p>
              </div>

              {/* 1. DEEP CLINICAL OBSERVATIONS */}
              <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950/40 p-5 shadow-inner">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🩺</span>
                    <span className="text-xs font-black uppercase tracking-wider text-blue-300">
                      Deep Clinical Observations
                    </span>
                  </div>
                  <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-[10px] font-bold text-blue-300">
                    xAI Grok Diagnostic Narrative
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-xs leading-relaxed">
                  {selectedAppointment.parsed_summary?.chief_complaint && (
                    <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-blue-400">
                        Primary Chief Complaint
                      </span>
                      <p className="mt-0.5 text-sm font-bold text-white">
                        {selectedAppointment.parsed_summary.chief_complaint}
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl bg-slate-950/80 p-4 border border-slate-800 text-slate-200 whitespace-pre-line">
                    {selectedAppointment.parsed_summary?.clinical_observations ||
                      selectedAppointment.parsed_summary?.summary ||
                      selectedAppointment.summary ||
                      "No clinical observations synthesized yet."}
                  </div>

                  {selectedAppointment.parsed_summary?.key_information &&
                    selectedAppointment.parsed_summary.key_information.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          Key Clinical Indicators
                        </span>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selectedAppointment.parsed_summary.key_information.map((item, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg bg-blue-950/60 px-2.5 py-1 text-xs font-medium text-blue-200 border border-blue-800/60"
                            >
                              • {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* 2. EXTRACTED MEDICATIONS (via Sarvam AI OCR) */}
              <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-tr from-slate-950 via-slate-900 to-cyan-950/30 p-5 shadow-inner">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💊</span>
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                      Extracted Medications (Sarvam AI OCR)
                    </span>
                  </div>
                  <span className="rounded-full bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                    Handwritten Rx Digitized
                  </span>
                </div>

                <div className="mt-4">
                  {normalizedMeds.length > 0 ? (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {normalizedMeds.map((med, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl bg-slate-950/80 p-3.5 border border-cyan-900/60 text-xs shadow-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">💊</span>
                            <span className="font-bold text-white truncate">{med.name}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300 border-t border-slate-800/80 pt-2">
                            <span>Dosage: <strong className="text-cyan-300">{med.dosage || "Standard"}</strong></span>
                            <span>Freq: <strong className="text-cyan-300">{med.frequency || "Daily"}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-950/60 p-4 border border-slate-800 text-xs text-slate-400 text-center">
                      No previous prescribed medications detected or attached.
                    </div>
                  )}
                </div>
              </div>

              {/* 3. DIAGNOSTIC FINDINGS & IMAGING DETECTION */}
              <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/30 p-5 shadow-inner">
                <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔬</span>
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                      Diagnostic Findings & Scans
                    </span>
                  </div>
                  <span className="rounded-full bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300">
                    Lab & Imaging Analysis
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-xs leading-relaxed">
                  {/* Highlight note if imaging/x-ray is present */}
                  {selectedAppointment.parsed_summary?.diagnostic_findings?.includes(
                    "X-ray/Imaging report detected"
                  ) && (
                    <div className="rounded-2xl border border-cyan-500/50 bg-cyan-950/40 p-3.5 text-xs font-semibold text-cyan-200 flex items-center gap-2.5">
                      <span className="text-xl">🩻</span>
                      <span>
                        X-ray/Imaging report detected. Direct view and download links are available below.
                      </span>
                    </div>
                  )}

                  <div className="rounded-2xl bg-slate-950/80 p-4 border border-slate-800 text-slate-200 whitespace-pre-line">
                    {selectedAppointment.parsed_summary?.diagnostic_findings ||
                      "No laboratory or radiological report attached for this consultation."}
                  </div>
                </div>
              </div>

              {/* 4. DUAL REPORT & PRESCRIPTION DOWNLOAD ACTION BUTTONS */}
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Clinical Document Access & Downloads
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  Inspect or download attached patient files directly from Cloudinary encrypted storage.
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {/* Prescription Action Button */}
                  {selectedPrescriptionUrl ? (
                    <a
                      href={selectedPrescriptionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold px-4 py-4 text-xs shadow-lg shadow-blue-500/20 transition-all duration-200 active:scale-95 text-center"
                    >
                      <span className="text-base">📄</span>
                      <span>View / Download Prescription</span>
                      <span className="text-blue-200">↗</span>
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800/40 border border-slate-800 text-slate-500 font-semibold px-4 py-4 text-xs text-center">
                      <span>📄</span>
                      <span>Prescription: Not provided</span>
                    </div>
                  )}

                  {/* Medical Report / X-Ray Action Button */}
                  {selectedReportUrl ? (
                    <a
                      href={selectedReportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold px-4 py-4 text-xs shadow-lg shadow-indigo-500/20 transition-all duration-200 active:scale-95 text-center"
                    >
                      <span className="text-base">🩻</span>
                      <span>View / Download Medical Report / X-Ray</span>
                      <span className="text-indigo-200">↗</span>
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-800/40 border border-slate-800 text-slate-500 font-semibold px-4 py-4 text-xs text-center">
                      <span>🩻</span>
                      <span>Medical Report / X-Ray: Not provided</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="border-t border-slate-800 p-6 flex justify-between gap-3 bg-slate-950/80">
              <button
                onClick={() =>
                  handleToggleStatus(
                    selectedAppointment.token,
                    selectedAppointment.status || "Waiting"
                  )
                }
                className="rounded-2xl border border-slate-700 bg-slate-800 px-5 py-3 text-xs font-bold text-slate-200 shadow-xs hover:bg-slate-700 hover:text-white"
              >
                Mark as {selectedAppointment.status === "Completed" ? "Waiting" : "Completed"}
              </button>

              <button
                onClick={() => setSelectedAppointment(null)}
                className="rounded-2xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-500 active:scale-95"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
