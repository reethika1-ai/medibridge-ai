"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type AppointmentItem = {
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
    router.push("/doctor/login");
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
                <th className="px-6 py-4">Attached Reports</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <span className="text-3xl">🩺</span>
                    <p className="mt-2 text-sm font-semibold">No patient records match the current filter.</p>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => {
                  const isCompleted = apt.status === "Completed";
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
                        <p className="font-bold text-white text-sm mt-0.5">{apt.patient_name}</p>
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
                            onClick={() => handleToggleStatus(apt.token, apt.status || "Waiting")}
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
                            {updatingToken === apt.token ? "Updating..." : apt.status || "Waiting"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {apt.report_public_id ? (
                          <span className="inline-flex items-center gap-1 font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-xl border border-cyan-800/60">
                            📑 1 File Attached
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">No attachments</span>
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

      {/* The Sliding Grok AI Insight Drawer (Slide-Over from Viewport Right) */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300">
          {/* Backdrop Click */}
          <div
            className="flex-1 cursor-pointer"
            onClick={() => setSelectedAppointment(null)}
          />

          {/* Drawer Panel */}
          <div className="relative flex h-full w-full max-w-xl flex-col bg-slate-900 shadow-2xl border-l border-slate-800 transform translate-x-0 transition-transform duration-300 ease-in-out text-slate-100">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-800 p-6 bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-md shadow-blue-500/30">
                  🩺
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Clinical Brief & AI Synthesis
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
              {/* Patient & Schedule Overview Strip */}
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-950/70 p-4 border border-slate-800">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Department</span>
                  <p className="text-sm font-bold text-white">{selectedAppointment.department}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Scheduled Date</span>
                  <p className="text-sm font-bold text-white">{selectedAppointment.appointment_date}</p>
                </div>
              </div>

              {/* Status Switcher in Drawer */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-950/70 p-4 border border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-200">Queue Consultation Status</span>
                  <p className="text-[11px] text-slate-400">Toggle patient through clinical workflow</p>
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
                      selectedAppointment.status === "Completed" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        selectedAppointment.status === "Completed" ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-xs font-bold text-white">
                    {selectedAppointment.status || "Waiting"}
                  </span>
                </div>
              </div>

              {/* Urgency Notification */}
              {selectedAppointment.urgent && (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-950/50 p-4 text-xs font-semibold text-rose-300 animate-pulse">
                  ⚠️ <strong>HIGH CLINICAL URGENCY:</strong> Red flag indicators present in intake. Immediate physician consultation prioritized.
                </div>
              )}

              {/* Patient Raw Symptoms */}
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Patient Reported Symptoms
                </span>
                <p className="mt-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                  {selectedAppointment.symptoms || "No symptoms recorded by patient."}
                </p>
              </div>

              {/* xAI Grok Clinical Synthesis Box */}
              <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-tr from-slate-950 to-blue-950/40 p-5 shadow-inner">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <span className="text-xs font-black uppercase tracking-wider text-blue-300">
                      xAI Grok Intake Assessment
                    </span>
                  </div>
                  <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-[10px] font-bold text-blue-300">
                    Structured Clinical Output
                  </span>
                </div>

                {selectedAppointment.parsed_summary ? (
                  <div className="mt-4 space-y-4 text-xs">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-slate-400">
                        Chief Complaint
                      </span>
                      <p className="mt-1 text-sm font-bold text-white">
                        {selectedAppointment.parsed_summary.chief_complaint}
                      </p>
                    </div>

                    {selectedAppointment.parsed_summary.key_information &&
                      selectedAppointment.parsed_summary.key_information.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold uppercase text-slate-400">
                            Key Clinical Findings
                          </span>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {selectedAppointment.parsed_summary.key_information.map((info, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 border border-slate-700"
                              >
                                • {info}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    <div>
                      <span className="text-[11px] font-bold uppercase text-slate-400">
                        Clinical Narrative
                      </span>
                      <p className="mt-1 rounded-2xl bg-slate-950/80 p-3.5 text-slate-300 leading-relaxed border border-slate-800">
                        {selectedAppointment.parsed_summary.summary}
                      </p>
                    </div>
                  </div>
                ) : selectedAppointment.summary ? (
                  <div className="mt-3 text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                    {selectedAppointment.summary}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">
                    No Grok AI summary generated for this record yet.
                  </p>
                )}
              </div>

              {/* Cloudinary Document Preview */}
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Attached Medical Document
                </span>
                {selectedAppointment.report_public_id ? (
                  <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📑</span>
                        <div>
                          <p className="text-xs font-bold text-white">Medical Report File</p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {selectedAppointment.report_public_id}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`https://res.cloudinary.com/igssaucs/image/upload/${selectedAppointment.report_public_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-500"
                      >
                        Open File ↗
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">No medical reports uploaded by patient.</p>
                )}
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
