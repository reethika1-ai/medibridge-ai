"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export type ExtractedMedication = {
  name: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  administration?: string;
  instructions?: string;
  source?: string;
};

export type RadiologyFindings = {
  detected?: boolean;
  scan_type?: string;
  anatomical_region?: string;
  modality?: string;
  key_findings?: string[];
  actionable_alert?: string;
};

export type LaboratoryBiomarker = {
  parameter?: string;
  value?: string;
  status?: "HIGH" | "LOW" | "NORMAL" | string;
  reference_range?: string;
};

export type ClinicalSynthesis = {
  primary_presentation?: string;
  in_depth_evaluation?: string;
  differential_indicators?: string[];
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
  urgency_level?: string | null;
  ambulance_id?: string | null;
  unit_assigned?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  prescription_url?: string | null;
  report_url?: string | null;
  blood_report_url?: string | null;
  document_url?: string | null;
  report_public_id: string | null;
  created_at: string;
  status?: string;
  parsed_summary?: {
    clinical_synthesis?: ClinicalSynthesis;
    clinical_observations?: string;
    extracted_medications?: ExtractedMedication[] | string[];
    radiology_findings?: RadiologyFindings;
    diagnostic_findings?: string;
    laboratory_biomarkers?: LaboratoryBiomarker[];
    urgency_level?: "Normal" | "Urgent" | string;
    urgency_reasons?: string[];
    urgency_flags?: string[];
    chief_complaint?: string;
    key_information?: string[];
    summary?: string;
    urgent_flag?: boolean;
    status?: string;
    ambulance_id?: string | null;
    unit_assigned?: string | null;
    latitude?: string | number | null;
    longitude?: string | number | null;
    reported_by?: string | null;
    eta_mins?: number | null;
    prescription_url?: string | null;
    report_url?: string | null;
  blood_report_url?: string | null;
    document_url?: string | null;
    mode?: string | null;
    location?: string | null;
    vehicle_notes?: string | null;
    gate_number?: string | null;
    [key: string]: any;
  } | null;
};

export function isRedAlert(apt?: AppointmentItem | null): boolean {
  if (!apt) return false;
  return Boolean(
    apt.urgency_level === "CRITICAL_RED_ALERT" ||
      apt.parsed_summary?.urgency_level === "CRITICAL_RED_ALERT" ||
      apt.token?.startsWith("EMG-") ||
      apt.patient_name?.includes("CRITICAL TRAUMA") ||
      apt.patient_name?.includes("CRITICAL ACCIDENT") ||
      apt.patient_name?.includes("INCOMING TRAUMA") ||
      apt.patient_name?.includes("UNIDENTIFIED ROADSIDE CASUALTY") ||
      apt.symptoms?.includes("[AMBULANCE DISPATCHED]") ||
      apt.symptoms?.includes("[SELF-ARRIVAL GATE 1]")
  );
}

/**
 * Two-tone Emergency Hospital Siren (960 Hz <-> 770 Hz)
 */
export function playEmergencySiren() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(960, ctx.currentTime);
    osc.frequency.setValueAtTime(770, ctx.currentTime + 0.3);
    osc.frequency.setValueAtTime(960, ctx.currentTime + 0.6);
    osc.frequency.setValueAtTime(770, ctx.currentTime + 0.9);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (err) {
    console.warn("Could not play emergency siren:", err);
  }
}

export const playRedAlertTone = playEmergencySiren;

export default function DoctorQueueClient({
  initialAppointments,
}: {
  initialAppointments: AppointmentItem[];
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState<AppointmentItem[]>(initialAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);
  const [updatingToken, setUpdatingToken] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "urgent" | "waiting" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [ehrExportSuccess, setEhrExportSuccess] = useState<string | null>(null);
  const [previewDocModal, setPreviewDocModal] = useState<string | null>(null);

  const seenRedAlertsRef = useRef<Set<string>>(new Set());

  // Keep state synchronized with prop updates (e.g. from real-time polling)
  useEffect(() => {
    setAppointments(initialAppointments);
  }, [initialAppointments]);

  useEffect(() => {
    let hasNewRedAlert = false;
    appointments.forEach((apt) => {
      const isUnaccepted =
        isRedAlert(apt) &&
        apt.status !== "In-Progress" &&
        apt.status !== "Completed" &&
        apt.status !== "Handled";
      if (isUnaccepted) {
        if (!seenRedAlertsRef.current.has(apt.token)) {
          seenRedAlertsRef.current.add(apt.token);
          hasNewRedAlert = true;
        }
      }
    });

    if (hasNewRedAlert) {
      playEmergencySiren();
    }
  }, [appointments]);

  async function handleUpdateStatus(token: string, newStatus: string) {
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

  function handleExportToEHR(token: string) {
    handleUpdateStatus(token, "Completed");
    setEhrExportSuccess(`Intake briefing & notes for token ${token} exported to clinic EHR.`);
    setTimeout(() => setEhrExportSuccess(null), 4000);
  }

  async function handleLogout() {
    await fetch("/api/doctor-login", { method: "DELETE" });
    router.push("/doctor-login");
    router.refresh();
  }

  // STEP 4: Normalized search so numeric strings (e.g. "406695") match "MB-406695" and vice versa
  const filteredAppointments = appointments.filter((item) => {
    const isCompleted = item.status === "Completed";
    if (filter === "urgent" && !item.urgent) return false;
    if (filter === "waiting" && isCompleted) return false;
    if (filter === "completed" && !isCompleted) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      const queryNumeric = query.replace(/\D/g, "");
      const tokenNumeric = item.token.replace(/\D/g, "");

      const matchToken =
        item.token.toLowerCase().includes(query) ||
        (queryNumeric.length > 0 && tokenNumeric.includes(queryNumeric));
      const matchName = item.patient_name.toLowerCase().includes(query);
      const matchDept = item.department.toLowerCase().includes(query);
      return matchToken || matchName || matchDept;
    }

    return true;
  });

  // Priority hierarchy:
  // 1. Unaccepted Red Alerts (Priority #0)
  // 2. In-Progress / Handled Red Alerts
  // 3. Urgent appointments (Waiting / In-Consultation)
  // 4. Standard appointments (Waiting / In-Consultation)
  // 5. Completed appointments
  const sortedFilteredAppointments = [...filteredAppointments].sort((a, b) => {
    const getScore = (apt: AppointmentItem) => {
      const red = isRedAlert(apt);
      const isCompleted = apt.status === "Completed";
      const isInProgress = apt.status === "In-Progress" || apt.status === "Handled";

      if (red && !isCompleted && !isInProgress) return 0; // Unaccepted Red Alert: highest priority (#0)
      if (red && isInProgress) return 1;                  // Handled / In-Progress Red Alert
      if (apt.urgent && !isCompleted) return 2;           // Urgent waiting
      if (!isCompleted) return 3;                         // Standard waiting
      return 4;                                           // Completed
    };

    const diff = getScore(a) - getScore(b);
    if (diff !== 0) return diff;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  const redAlertCount = appointments.filter((a) => isRedAlert(a)).length;

  const urgentCount = appointments.filter((a) => a.urgent).length;
  const waitingCount = appointments.filter((a) => a.status !== "Completed").length;
  const completedCount = appointments.filter((a) => a.status === "Completed").length;

  // Selected appointment resolved document URLs
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

  const selectedBloodReportUrl =
    selectedAppointment?.blood_report_url ||
    selectedAppointment?.parsed_summary?.blood_report_url ||
    null;

  // Normalize extracted medications array
  const rawMeds = selectedAppointment?.parsed_summary?.extracted_medications || [];
  const normalizedMeds: ExtractedMedication[] = rawMeds.map((m: any) => {
    if (typeof m === "string") {
      return {
        name: m,
        strength: "Standard Dose",
        dosage: "Standard Dose",
        frequency: "Daily",
        administration: "Take as directed",
        instructions: "Take as directed",
        source: "Handwritten Rx Note",
      };
    }
    return {
      name: m.name || "Medication",
      strength: m.strength || m.dosage || "Standard Dose",
      dosage: m.dosage || m.strength || "Standard Dose",
      frequency: m.frequency || "Daily",
      administration: m.administration || m.instructions || "Take as directed",
      instructions: m.instructions || m.administration || "Take as directed",
      source: m.source || "Handwritten Rx Note",
    };
  });

  // Selected appointment clinical breakdown
  const summaryObj = selectedAppointment?.parsed_summary;
  const clinicalSynthesis = summaryObj?.clinical_synthesis;
  const radiologyFindings = summaryObj?.radiology_findings;
  const suspectedConditions: string[] =
    summaryObj?.suspected_conditions ||
    clinicalSynthesis?.differential_indicators ||
    summaryObj?.key_information ||
    [];

  const recommendedInvestigations: string[] =
    summaryObj?.recommended_investigations ||
    [];

  const recommendedMedications: string[] =
    summaryObj?.recommended_medications ||
    [];

  const rawBiomarkersList =
    summaryObj?.biomarkers ||
    summaryObj?.laboratory_biomarkers ||
    [];

  const normalizedBiomarkers = rawBiomarkersList.map((b: any) => {
    const name = b.name || b.parameter || "Biomarker";
    const value = b.value || "--";
    const reference = b.reference || b.reference_range || "Clinical Standard";
    let status: "Normal" | "High" | "Low" | "Critical" = "Normal";
    const rawStatus = String(b.status || "").toLowerCase();
    if (rawStatus.includes("crit")) status = "Critical";
    else if (rawStatus.includes("high")) status = "High";
    else if (rawStatus.includes("low")) status = "Low";
    else status = "Normal";

    return { name, value, reference, status };
  });

  const biomarkers = normalizedBiomarkers;

  const primaryPresentation =
    clinicalSynthesis?.primary_presentation ||
    summaryObj?.chief_complaint ||
    selectedAppointment?.symptoms?.slice(0, 80) ||
    "Clinical Consultation Intake";

  const inDepthEvaluation =
    clinicalSynthesis?.in_depth_evaluation ||
    summaryObj?.clinical_observations ||
    summaryObj?.summary ||
    selectedAppointment?.summary ||
    "Comprehensive clinical differential being processed.";

  const differentialIndicators =
    clinicalSynthesis?.differential_indicators ||
    summaryObj?.key_information ||
    [];

  const isScanDetected = Boolean(
    radiologyFindings?.detected ||
      selectedReportUrl ||
      summaryObj?.diagnostic_findings?.includes("X-ray/Imaging report detected")
  );

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
          <div className="relative flex-1 sm:w-72">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search token (e.g. 406695 / MB-...), name, dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 pl-9 pr-4 py-2.5 text-xs sm:text-sm font-medium text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
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
              {sortedFilteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <span className="text-3xl">🩺</span>
                    <p className="mt-2 text-sm font-semibold">
                      No patient records match the current filter or search criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                sortedFilteredAppointments.map((apt) => {
                  const isCompleted = apt.status === "Completed";
                  const isConsulting = apt.status === "In-Consultation";
                  const redAlert = isRedAlert(apt);
                  const rx = apt.prescription_url || apt.parsed_summary?.prescription_url;
                  const rep =
                    apt.report_url ||
                    apt.parsed_summary?.report_url ||
                    apt.report_public_id ||
                    apt.document_url;
                  const blood = apt.blood_report_url || apt.parsed_summary?.blood_report_url;

                  return (
                    <React.Fragment key={apt.token}>
                      {redAlert && (
                        <tr className="border-b border-red-500/40 bg-gradient-to-r from-red-950 via-rose-900 to-red-950 text-white font-black text-xs uppercase tracking-wider animate-pulse">
                          <td colSpan={6} className="px-6 py-2 border-l-4 border-red-500">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-2.5 w-2.5 rounded-full bg-red-400 animate-ping" />
                                <span className="text-red-100">
                                  {apt.status === "In-Progress" || apt.status === "Handled"
                                    ? "✅ PRIORITY RESTORED: EMERGENCY CASE HANDLED — IN-TRANSIT / ACTIVE RESUSCITATION"
                                    : apt.status === "Completed"
                                    ? "✓ EMERGENCY CASE RESOLVED & ARCHIVED"
                                    : apt.token?.startsWith("EMG-GATE") ||
                                      apt.parsed_summary?.mode === "SELF_ARRIVAL"
                                    ? "🚨 PRIORITY #0: HOSPITAL GATE 1 INCOMING CASUALTY — RAPID ER MOBILIZATION ALERT"
                                    : "🚨 PRIORITY #0: AUTONOMOUS AMBULANCE DISPATCHED — CRITICAL ROAD TRAUMA ALERT"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {apt.status !== "In-Progress" &&
                                apt.status !== "Handled" &&
                                apt.status !== "Completed" ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateStatus(apt.token, "In-Progress");
                                    }}
                                    disabled={updatingToken === apt.token}
                                    className="rounded-full bg-red-600 hover:bg-red-500 px-3.5 py-1 text-[11px] font-black text-white shadow-md ring-1 ring-white/40 transition active:scale-95 disabled:opacity-50"
                                  >
                                    {t("accept_case_btn")}
                                  </button>
                                ) : apt.status === "In-Progress" || apt.status === "Handled" ? (
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-emerald-900/90 border border-emerald-400 px-2.5 py-0.5 text-[10px] font-black text-emerald-300">
                                      {t("case_handled_badge")}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateStatus(apt.token, "Completed");
                                      }}
                                      disabled={updatingToken === apt.token}
                                      className="rounded-full bg-teal-600 hover:bg-teal-500 px-3 py-1 text-[11px] font-black text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                                    >
                                      {t("resolve_case_btn")}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="rounded-full bg-emerald-950 border border-emerald-600/60 px-2.5 py-0.5 text-[10px] font-black text-emerald-400">
                                    ✓ Case Resolved
                                  </span>
                                )}
                                <span className="rounded-md bg-black/60 px-2.5 py-0.5 text-[10px] font-mono text-cyan-300 border border-red-400/40">
                                  {apt.token?.startsWith("EMG-GATE") ||
                                  apt.parsed_summary?.mode === "SELF_ARRIVAL"
                                    ? "GATE 1 ENTRANCE STANDBY"
                                    : "UNIT #MED-09 EN ROUTE"}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr
                        className={`group transition-all duration-150 hover:bg-slate-800/40 ${
                          redAlert
                            ? "border-l-4 border-red-500 bg-red-950/30 ring-1 ring-red-500/40"
                            : apt.urgent
                            ? "border-l-4 border-rose-500 bg-rose-950/20"
                            : "border-l-4 border-slate-800"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-base font-black transition-colors ${
                                redAlert
                                  ? "text-red-400 group-hover:text-red-300"
                                  : "text-blue-400 group-hover:text-blue-300"
                              }`}
                            >
                              {apt.token}
                            </span>
                            {redAlert && (
                              <span className="rounded bg-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-300 border border-red-400/50">
                                SOS
                              </span>
                            )}
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
                          {redAlert ? (
                            apt.status === "In-Progress" || apt.status === "Handled" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950 border border-emerald-500/60 px-3 py-1 text-xs font-black text-emerald-300">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                {t("case_handled_badge")}
                              </span>
                            ) : apt.status === "Completed" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
                                ✓ Resolved
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white shadow-md shadow-red-500/40 animate-pulse border border-red-400">
                                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                                CRITICAL RED ALERT
                              </span>
                            )
                          ) : apt.urgent ? (
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

                        {/* Interactive Consultation Status */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                isCompleted
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800/80"
                                  : isConsulting
                                  ? "bg-cyan-950 text-cyan-300 border border-cyan-800/80 animate-pulse"
                                  : "bg-amber-950 text-amber-300 border border-amber-800/80"
                              }`}
                            >
                              {apt.status || "Waiting"}
                            </span>
                          </div>
                        </td>

                        {/* Multi-Document Indicators */}
                        <td className="px-6 py-4 text-xs">
                          <div className="flex flex-wrap items-center gap-1">
                            {rx && (
                              <span className="inline-flex items-center gap-1 font-bold text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-800/60 text-[10px]">
                                📄 Rx
                              </span>
                            )}
                            {blood && (
                              <span className="inline-flex items-center gap-1 font-bold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-800/60 text-[10px]">
                                🩸 Blood
                              </span>
                            )}
                            {rep && (
                              <span className="inline-flex items-center gap-1 font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-800/60 text-[10px]">
                                🩻 Scan
                              </span>
                            )}
                            {!rx && !blood && !rep && (
                              <span className="text-slate-500 text-xs">No files</span>
                            )}
                          </div>
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
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STEP 3: THE SPECIALIZED 6-TIER CLINICAL TRIAGE DRAWER */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-sm transition-opacity duration-300">
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
                    Specialized Physician Triage Briefing
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

            {/* Notification Toast for EHR Export */}
            {ehrExportSuccess && (
              <div className="bg-emerald-950/90 border-b border-emerald-800 p-3 text-center text-xs font-bold text-emerald-300 animate-fadeIn">
                ✓ {ehrExportSuccess}
              </div>
            )}

            {/* Drawer Scrollable Body: EXACT 6-TIER BRIEFING LAYOUT */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* DEDICATED RED ALERT TELEMETRY CARD (AMBULANCE VS GATE MOBILIZATION) */}
              {isRedAlert(selectedAppointment) && (
                <div className="rounded-3xl border-2 border-red-500 bg-gradient-to-r from-red-950 via-slate-900 to-red-950 p-5 shadow-2xl shadow-red-950/80 animate-pulse">
                  <div className="flex items-center justify-between border-b border-red-500/40 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-3 w-3 rounded-full bg-red-500 animate-ping" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-red-200">
                        {selectedAppointment?.token?.startsWith("EMG-GATE") ||
                        selectedAppointment?.parsed_summary?.mode === "SELF_ARRIVAL"
                          ? "HOSPITAL GATE 1 ER MOBILIZATION TELEMETRY"
                          : "AUTONOMOUS AMBULANCE FLEET TELEMETRY"}
                      </h4>
                    </div>
                    <span className="rounded-full bg-red-500/20 border border-red-400 px-3 py-0.5 text-[11px] font-black text-red-300">
                      {selectedAppointment?.token?.startsWith("EMG-GATE") ||
                      selectedAppointment?.parsed_summary?.mode === "SELF_ARRIVAL"
                        ? "GATE 1 MOBILIZED (LEVEL 1 TRAUMA)"
                        : "DISPATCH STATUS: EN ROUTE (LEVEL 1 TRAUMA)"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-2xl bg-black/60 p-3 border border-red-500/30">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Unit</span>
                      <p className="mt-1 font-mono font-bold text-white text-xs sm:text-sm">
                        {selectedAppointment?.parsed_summary?.unit_assigned ||
                          (selectedAppointment?.token?.startsWith("EMG-GATE")
                            ? "Gate 1 ER Rapid Mobilization Unit"
                            : "Smart AV-Ambulance #MED-09 (Autonomous Trauma Fleet)")}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-black/60 p-3 border border-red-500/30">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {selectedAppointment?.token?.startsWith("EMG-GATE") ||
                        selectedAppointment?.parsed_summary?.mode === "SELF_ARRIVAL"
                          ? "Vehicle / Inbound Notes"
                          : "Live GPS Coordinates"}
                      </span>
                      <p className="mt-1 font-mono font-bold text-cyan-300 text-xs sm:text-sm truncate">
                        {selectedAppointment?.parsed_summary?.vehicle_notes ||
                          selectedAppointment?.parsed_summary?.location ||
                          `${selectedAppointment?.parsed_summary?.latitude || "17.4435° N"}, ${selectedAppointment?.parsed_summary?.longitude || "78.3772° E"}`}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-black/60 p-3 border border-red-500/30">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Trauma Bay ETA</span>
                      <p className="mt-1 font-mono font-black text-rose-400 text-xs sm:text-sm">
                        {selectedAppointment?.parsed_summary?.eta_mins || 5} mins (Priority Clearance)
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-red-300">
                    <span>
                      Incident Origin:{" "}
                      {selectedAppointment?.parsed_summary?.reported_by ||
                        (selectedAppointment?.token?.startsWith("EMG-GATE")
                          ? "Incoming Patient / Bystander at Gate"
                          : "Bystander / Roadside Alert")}
                    </span>
                    <span className="font-semibold text-emerald-400">✓ Resuscitation & Crash-Cart Ready</span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-red-500/30 flex items-center justify-between">
                    <div>
                      {selectedAppointment.status === "In-Progress" || selectedAppointment.status === "Handled" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950 border border-emerald-500 px-3 py-1 text-xs font-black text-emerald-300">
                          {t("case_handled_badge")}
                        </span>
                      ) : selectedAppointment.status === "Completed" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-600 px-3 py-1 text-xs font-bold text-slate-300">
                          ✓ Case Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-900/60 border border-red-500 px-3 py-1 text-xs font-black text-red-200 animate-pulse">
                          🚨 Unaccepted Emergency
                        </span>
                      )}
                    </div>
                    {selectedAppointment.status !== "In-Progress" &&
                    selectedAppointment.status !== "Handled" &&
                    selectedAppointment.status !== "Completed" ? (
                      <button
                        onClick={() => handleUpdateStatus(selectedAppointment.token, "In-Progress")}
                        disabled={updatingToken === selectedAppointment.token}
                        className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-black px-4 py-2 text-xs shadow-md shadow-red-600/40 ring-2 ring-red-400 transition active:scale-95 disabled:opacity-50"
                      >
                        {t("accept_case_btn")}
                      </button>
                    ) : selectedAppointment.status === "In-Progress" || selectedAppointment.status === "Handled" ? (
                      <button
                        onClick={() => handleUpdateStatus(selectedAppointment.token, "Completed")}
                        disabled={updatingToken === selectedAppointment.token}
                        className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black px-4 py-2 text-xs shadow-md transition active:scale-95 disabled:opacity-50"
                      >
                        {t("resolve_case_btn")}
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              {/* TIER 1: TOP SAFETY GUARDRAIL */}
              <div className="rounded-2xl border border-amber-500/40 bg-amber-950/50 p-4 text-xs font-medium text-amber-200 leading-relaxed shadow-sm">
                ⚖️ <strong>CLINICAL DECISION SUPPORT NOTICE (AI SAFETY GUARDRAIL):</strong> MediBridge AI models provide preliminary synthesis for triage acceleration only. Machine learning models are subject to margin of error. Clinicians must cross-verify all extracted medications and radiological impressions against the original source documents before prescribing.
              </div>

              {/* Patient Demographics Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl bg-slate-950/70 p-4 border border-slate-800 text-xs">
                <div>
                  <span className="font-semibold text-slate-400">Specialty</span>
                  <p className="font-bold text-white truncate">{selectedAppointment.department}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-400">Scheduled Time</span>
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
                  <span className="font-semibold text-slate-400">Contact Phone</span>
                  <p className="font-bold text-white truncate">
                    {selectedAppointment.phone || "Not recorded"}
                  </p>
                </div>
              </div>

              {/* TIER 2: 🩺 CHIEF COMPLAINT & DEEP CLINICAL SYNTHESIS */}
              <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950/40 p-5 shadow-inner">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🩺</span>
                    <span className="text-xs font-black uppercase tracking-wider text-blue-300">
                      Chief Complaint & Deep Clinical Synthesis
                    </span>
                  </div>
                  <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-[10px] font-bold text-blue-300">
                    Pathophysiological Reasoning
                  </span>
                </div>

                <div className="mt-4 space-y-3.5 text-xs leading-relaxed">
                  <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-blue-400">
                      Primary Clinical Presentation
                    </span>
                    <p className="mt-0.5 text-sm font-bold text-white">
                      {primaryPresentation}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950/80 p-4 border border-slate-800 text-slate-200 whitespace-pre-line leading-relaxed">
                    <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                      In-Depth Evaluation Narrative
                    </span>
                    {inDepthEvaluation}
                    {!inDepthEvaluation.includes("Physician assessment required. AI generated differential analysis.") && (
                      <p className="mt-2 text-[11px] font-semibold text-amber-300/90 italic">
                        Physician assessment required. AI generated differential analysis.
                      </p>
                    )}
                  </div>

                  {suspectedConditions.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Differential Diagnoses (Ranked by Suspicion)
                      </span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {suspectedConditions.map((condition, idx) => (
                          <span
                            key={idx}
                            className="rounded-lg bg-blue-950/80 px-2.5 py-1 text-xs font-bold text-blue-200 border border-blue-800/80 shadow-xs"
                          >
                            <span className="text-blue-400 font-mono mr-1">#{idx + 1}</span>
                            {condition}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {recommendedInvestigations.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Recommended Confirmatory Investigations
                      </span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {recommendedInvestigations.map((inv, idx) => (
                          <span
                            key={idx}
                            className="rounded-lg bg-indigo-950/70 px-2.5 py-1 text-xs font-medium text-indigo-200 border border-indigo-800/60"
                          >
                            🧪 {inv}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {recommendedMedications.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Supportive Pharmacotherapy to Consider
                      </span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {recommendedMedications.map((med, idx) => (
                          <span
                            key={idx}
                            className="rounded-lg bg-teal-950/70 px-2.5 py-1 text-xs font-medium text-teal-200 border border-teal-800/60"
                          >
                            💊 {med}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* TIER 3: 🩻 RADIOLOGY & IMAGING DETECTION SUITE */}
              <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/30 p-5 shadow-inner">
                <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🩻</span>
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                      Radiology & Imaging Detection Suite
                    </span>
                  </div>
                  <span className="rounded-full bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300">
                    {isScanDetected ? "Scan Detected" : "No Scan"}
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-xs leading-relaxed">
                  {isScanDetected ? (
                    <>
                      {/* Scan Details Card */}
                      <div className="rounded-2xl bg-slate-950/80 p-4 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">
                            {radiologyFindings?.scan_type || "DIGITAL CHEST RADIOGRAPH - PA VIEW"}
                          </span>
                          <span className="rounded-md bg-indigo-950 border border-indigo-700/60 px-2 py-0.5 text-[10px] text-indigo-200">
                            {radiologyFindings?.modality || "Plain Film X-Ray"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Region: <strong className="text-slate-200">{radiologyFindings?.anatomical_region || "Thoracic Cage / Pulmonary Parenchyma"}</strong>
                        </p>

                        {radiologyFindings?.key_findings && radiologyFindings.key_findings.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400">
                              Key AI Observations:
                            </span>
                            {radiologyFindings.key_findings.map((f, idx) => (
                              <p key={idx} className="text-slate-300 text-[11px]">
                                • {f}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Yellow Warning Action Alert */}
                      <div className="rounded-2xl border border-amber-500/60 bg-amber-950/40 p-3.5 text-xs font-semibold text-amber-200 flex items-center gap-2.5">
                        <span className="text-lg">⚠️</span>
                        <span>
                          Action Alert: X-ray/Imaging report detected. Direct view and download links are available below.
                        </span>
                      </div>

                      {/* Action Buttons for Imaging */}
                      {selectedReportUrl && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            onClick={() => setPreviewDocModal(selectedReportUrl)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2.5 font-bold text-white text-xs transition active:scale-95 shadow-sm"
                          >
                            <span>👁️</span>
                            <span>Quick Inspect Scan / Report</span>
                          </button>
                          <a
                            href={selectedReportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-950/60 hover:bg-indigo-900/60 px-3.5 py-2.5 font-bold text-indigo-200 text-xs transition active:scale-95"
                          >
                            <span>📥</span>
                            <span>Download Original DICOM/Image</span>
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-2xl bg-slate-950/60 p-4 border border-slate-800 text-xs text-slate-400 text-center">
                      No radiological imaging study or scan detected in this intake profile.
                    </div>
                  )}
                </div>
              </div>

              {/* TIER 4: 💊 PREVIOUS MEDICATIONS REGIMEN (via Sarvam AI OCR) */}
              <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-tr from-slate-950 via-slate-900 to-cyan-950/30 p-5 shadow-inner">
                <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💊</span>
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                      Previous Medications Regimen (Sarvam AI OCR)
                    </span>
                  </div>
                  <span className="rounded-full bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                    Handwritten Rx Digitized
                  </span>
                </div>

                <div className="mt-4">
                  {normalizedMeds.length > 0 ? (
                    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="border-b border-slate-800 bg-slate-900/90 text-[10px] font-black uppercase text-slate-400">
                          <tr>
                            <th className="px-3.5 py-2.5">Medication Name</th>
                            <th className="px-3.5 py-2.5">Strength</th>
                            <th className="px-3.5 py-2.5">Dosage / Frequency</th>
                            <th className="px-3.5 py-2.5">Administration</th>
                            <th className="px-3.5 py-2.5">Extraction Source</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {normalizedMeds.map((med, idx) => (
                            <tr key={idx} className="hover:bg-slate-850/50">
                              <td className="px-3.5 py-2.5 font-bold text-white flex items-center gap-1.5">
                                <span>💊</span>
                                <span>{med.name}</span>
                              </td>
                              <td className="px-3.5 py-2.5 text-cyan-300">
                                {med.strength || med.dosage || "Standard"}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-300">{med.frequency || "Daily"}</td>
                              <td className="px-3.5 py-2.5 text-slate-400">
                                {med.administration || med.instructions || "As directed"}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-400 font-mono text-[10px]">
                                {med.source || "Handwritten Rx Note"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-950/60 p-4 border border-slate-800 text-xs text-slate-400 text-center">
                      No previous prescription medications detected or attached.
                    </div>
                  )}
                </div>
              </div>

              {/* TIER 5: 🔬 CRITICAL LABORATORY BIOMARKERS */}
              <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-tr from-slate-950 via-slate-900 to-rose-950/20 p-5 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔬</span>
                    <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                      Critical Laboratory Biomarkers & Lab Panels
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedBloodReportUrl && (
                      <span className="rounded-full bg-rose-950 border border-rose-700/60 px-2.5 py-0.5 text-[10px] font-black text-rose-300 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                        Blood Report Attached
                      </span>
                    )}
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-400">
                      {normalizedBiomarkers.length} Parameters
                    </span>
                  </div>
                </div>

                {/* Attached Blood Report Action Bar */}
                {selectedBloodReportUrl && (
                  <div className="mt-3 flex items-center justify-between rounded-2xl bg-rose-950/40 p-3 border border-rose-500/30 text-xs">
                    <span className="font-semibold text-rose-200 flex items-center gap-1.5">
                      <span>🩸</span>
                      <span>Recent Blood Report Panel (CBC / LFT / KFT) attached</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewDocModal(selectedBloodReportUrl)}
                        className="rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-1.5 font-bold text-white text-[11px] shadow-sm transition active:scale-95"
                      >
                        👁️ Quick Inspect
                      </button>
                      <a
                        href={selectedBloodReportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="rounded-xl border border-rose-500/40 bg-rose-950/60 hover:bg-rose-900/60 px-3 py-1.5 font-bold text-rose-200 text-[11px] transition"
                      >
                        📥 Download
                      </a>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  {normalizedBiomarkers.length > 0 ? (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {normalizedBiomarkers.map((bio: any, idx: number) => {
                        const isCrit = bio.status === "Critical";
                        const isHigh = bio.status === "High";
                        const isLow = bio.status === "Low";

                        return (
                          <div
                            key={idx}
                            className={`rounded-2xl p-3.5 border text-xs transition-all ${
                              isCrit
                                ? "bg-rose-950/70 border-rose-500/70 shadow-lg shadow-rose-950/60"
                                : isHigh
                                ? "bg-amber-950/40 border-amber-500/40"
                                : isLow
                                ? "bg-blue-950/40 border-blue-500/40"
                                : "bg-slate-900/90 border-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs">{bio.name}</span>
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                                  isCrit
                                    ? "bg-rose-500/30 text-rose-200 border border-rose-400 animate-pulse"
                                    : isHigh
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                    : isLow
                                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                }`}
                              >
                                {isCrit
                                  ? "🚨 [CRITICAL]"
                                  : isHigh
                                  ? "▲ [HIGH]"
                                  : isLow
                                  ? "▼ [LOW]"
                                  : "[NORMAL]"}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                              <span>Value: <strong className="text-white font-mono">{bio.value}</strong></span>
                              <span className="text-[10px] text-slate-400">Ref: {bio.reference}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-950/60 p-4 border border-slate-800 text-xs text-slate-400 text-center">
                      No abnormal diagnostic laboratory biomarkers detected in this intake. Attach a Recent Blood Report to extract automated biomarker telemetry.
                    </div>
                  )}
                </div>
              </div>

              {/* TIER 6: 📁 ENCRYPTED CLINICAL RECORD VAULT & CLINICIAN WORKFLOW */}
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Encrypted Clinical Record Vault & Action Buttons
                </span>

                {/* Document Access Actions */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {selectedPrescriptionUrl ? (
                    <a
                      href={selectedPrescriptionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold px-3.5 py-3 text-xs shadow-lg shadow-blue-500/20 transition-all duration-200 active:scale-95 text-center"
                    >
                      <span className="text-base">📄</span>
                      <span>Handwritten Rx Slip</span>
                      <span className="text-blue-200">↗</span>
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-850 border border-slate-800 text-slate-500 font-semibold px-3 py-3 text-xs text-center">
                      <span>📄</span>
                      <span>Rx: Not attached</span>
                    </div>
                  )}

                  {selectedBloodReportUrl ? (
                    <a
                      href={selectedBloodReportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold px-3.5 py-3 text-xs shadow-lg shadow-rose-500/20 transition-all duration-200 active:scale-95 text-center"
                    >
                      <span className="text-base">🩸</span>
                      <span>Recent Blood Report</span>
                      <span className="text-rose-200">↗</span>
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-850 border border-slate-800 text-slate-500 font-semibold px-3 py-3 text-xs text-center">
                      <span>🩸</span>
                      <span>Blood: Not attached</span>
                    </div>
                  )}

                  {selectedReportUrl ? (
                    <a
                      href={selectedReportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold px-3.5 py-3 text-xs shadow-lg shadow-indigo-500/20 transition-all duration-200 active:scale-95 text-center"
                    >
                      <span className="text-base">🩻</span>
                      <span>Radiology Scan</span>
                      <span className="text-indigo-200">↗</span>
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-850 border border-slate-800 text-slate-500 font-semibold px-3 py-3 text-xs text-center">
                      <span>🩻</span>
                      <span>Scan: Not attached</span>
                    </div>
                  )}
                </div>

                {/* Clinician Workflow Consultation Action Buttons */}
                <div className="pt-2 border-t border-slate-850 grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedAppointment.token, "In-Consultation")}
                    disabled={updatingToken === selectedAppointment.token}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/40 bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-200 font-bold px-4 py-3 text-xs transition active:scale-95 disabled:opacity-50"
                  >
                    <span>▶</span>
                    <span>Call Patient & Mark In-Consultation</span>
                  </button>

                  <button
                    onClick={() => handleExportToEHR(selectedAppointment.token)}
                    disabled={updatingToken === selectedAppointment.token}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 text-xs transition active:scale-95 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                  >
                    <span>✓</span>
                    <span>Complete Intake & Export Notes to EHR</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="border-t border-slate-800 p-6 flex justify-between gap-3 bg-slate-950/80">
              <button
                onClick={() =>
                  handleUpdateStatus(
                    selectedAppointment.token,
                    selectedAppointment.status === "Completed" ? "Waiting" : "Completed"
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

      {/* Quick Modal Viewer */}
      {previewDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-950">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>🩻</span>
                <span>Radiology & Document Quick Inspector</span>
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewDocModal}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500"
                >
                  Download Original
                </a>
                <button
                  onClick={() => setPreviewDocModal(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="h-[75vh] bg-slate-950 p-4 flex items-center justify-center">
              <iframe
                src={previewDocModal}
                className="h-full w-full rounded-2xl border border-slate-800"
                title="Document Quick Inspector"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
