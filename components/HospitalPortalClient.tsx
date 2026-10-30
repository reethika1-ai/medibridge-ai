"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DoctorQueueClient, { AppointmentItem, isRedAlert } from "@/components/DoctorQueueClient";
import DoctorAuthGuard from "@/components/DoctorAuthGuard";
import { useLanguage } from "@/context/LanguageContext";

interface HospitalPortalClientProps {
  initialAppointments: AppointmentItem[];
}

type HospitalTab = "doctor" | "ambulance" | "gate";

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

export default function HospitalPortalClient({
  initialAppointments,
}: HospitalPortalClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const initialTab = (searchParams.get("tab") as HospitalTab) || "doctor";

  const [activeTab, setActiveTab] = useState<HospitalTab>(
    ["doctor", "ambulance", "gate"].includes(initialTab) ? initialTab : "doctor"
  );
  const [appointments, setAppointments] = useState<AppointmentItem[]>(initialAppointments);
  const [updatingToken, setUpdatingToken] = useState<string | null>(null);

  // Track acknowledged red alerts to fire siren on new alerts
  const seenEmergenciesRef = useRef<Set<string>>(
    new Set(initialAppointments.filter((a) => isRedAlert(a)).map((a) => a.token))
  );

  // Interactive checklists per gate casualty token
  const [gateChecklists, setGateChecklists] = useState<
    Record<string, { stretcher: boolean; nurse: boolean; bay: boolean }>
  >({});

  // Sync tab with URL
  useEffect(() => {
    const tabParam = searchParams.get("tab") as HospitalTab;
    if (tabParam && ["doctor", "ambulance", "gate"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  function handleTabChange(tab: HospitalTab) {
    setActiveTab(tab);
    router.replace(`/hospital?tab=${tab}`);
  }

  // Active emergencies that require immediate acceptance / dispatch
  const unacceptedEmergencies = appointments.filter(
    (apt) =>
      isRedAlert(apt) &&
      apt.status !== "In-Progress" &&
      apt.status !== "Completed" &&
      apt.status !== "Handled"
  );
  const hasUnacceptedEmergency = unacceptedEmergencies.length > 0;

  // Active emergencies currently being handled
  const inProgressEmergencies = appointments.filter(
    (apt) =>
      isRedAlert(apt) &&
      (apt.status === "In-Progress" || apt.status === "Handled")
  );

  // Real-time synchronization: poll /api/appointments every 3s to populate Tabs 1, 2, and 3 instantly
  useEffect(() => {
    let isMounted = true;

    async function fetchLatestAppointments() {
      try {
        const res = await fetch("/api/appointments", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const items: AppointmentItem[] = json.appointments || json.data || [];

        if (isMounted && Array.isArray(items)) {
          let hasNewEmergency = false;

          items.forEach((apt) => {
            const isUnaccepted =
              isRedAlert(apt) &&
              apt.status !== "In-Progress" &&
              apt.status !== "Completed" &&
              apt.status !== "Handled";
            if (isUnaccepted) {
              if (!seenEmergenciesRef.current.has(apt.token)) {
                seenEmergenciesRef.current.add(apt.token);
                hasNewEmergency = true;
              }
            }
          });

          if (hasNewEmergency) {
            playEmergencySiren();
          }

          setAppointments(items);
        }
      } catch (e) {
        // Silent network retry
      }
    }

    const intervalId = setInterval(fetchLatestAppointments, 3000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Track total red alerts across queue
  const redAlertTotal = appointments.filter((a) => isRedAlert(a)).length;

  // Persistent two-tone ER siren loop ONLY while unaccepted Red Alerts exist
  useEffect(() => {
    if (!hasUnacceptedEmergency) return;

    // Trigger cycle immediately
    playEmergencySiren();

    // Replay every 3.5 seconds persistently while unaccepted Red Alerts are active
    const sirenTimer = setInterval(() => {
      playEmergencySiren();
    }, 3500);

    return () => clearInterval(sirenTimer);
  }, [hasUnacceptedEmergency]);

  // Filter for Ambulance Fleet
  const ambulanceAppointments = appointments.filter((apt) => {
    return Boolean(
      apt.token?.startsWith("EMG-AMB") ||
        apt.symptoms?.includes("[AMBULANCE DISPATCHED]") ||
        apt.symptoms?.includes("AMBULANCE SOS") ||
        apt.parsed_summary?.mode === "AMBULANCE" ||
        (apt.token?.startsWith("EMG-") &&
          !apt.token?.startsWith("EMG-GATE") &&
          !apt.symptoms?.includes("SELF-ARRIVAL") &&
          !apt.symptoms?.includes("SELF ARRIVAL"))
    );
  });

  // Filter for Gate Triage
  const gateAppointments = appointments.filter((apt) => {
    return Boolean(
      apt.token?.startsWith("EMG-GATE") ||
        apt.symptoms?.includes("[SELF-ARRIVAL GATE 1]") ||
        apt.symptoms?.includes("SELF ARRIVAL") ||
        apt.symptoms?.includes("SELF-ARRIVAL") ||
        apt.parsed_summary?.mode === "SELF_ARRIVAL"
    );
  });

  // Update appointment status (e.g. Patient Picked Up / Received at Gate)
  async function handleUpdateAppointmentStatus(token: string, newStatus: string) {
    setUpdatingToken(token);
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, status: newStatus }),
      });

      if (res.ok) {
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.token === token
              ? {
                  ...apt,
                  status: newStatus,
                  parsed_summary: apt.parsed_summary
                    ? { ...apt.parsed_summary, status: newStatus }
                    : apt.parsed_summary,
                }
              : apt
          )
        );
      }
    } catch (err) {
      console.warn("Failed to update status:", err);
    } finally {
      setUpdatingToken(null);
    }
  }

  function toggleGateChecklist(token: string, key: "stretcher" | "nurse" | "bay") {
    setGateChecklists((prev) => {
      const current = prev[token] || { stretcher: true, nurse: true, bay: true };
      return {
        ...prev,
        [token]: {
          ...current,
          [key]: !current[key],
        },
      };
    });
  }

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* MULTI-DEPARTMENT HIGH-DENSITY TAB NAVIGATION             */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-full border border-slate-200/80 bg-white p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Doctor Clinical Triage */}
          <button
            type="button"
            onClick={() => handleTabChange("doctor")}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all duration-200 ${
              activeTab === "doctor"
                ? "bg-gradient-to-r from-[#00A896] via-[#028090] to-[#02C39A] text-white shadow-md shadow-teal-600/25 ring-2 ring-teal-400/30"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span>🩺</span>
            <span>Doctor Clinical Triage</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeTab === "doctor" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {appointments.length}
            </span>
          </button>

          {/* Tab 2: Ambulance Fleet & GPS Console */}
          <button
            type="button"
            onClick={() => handleTabChange("ambulance")}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all duration-200 ${
              activeTab === "ambulance"
                ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/25 ring-2 ring-rose-400/30"
                : "text-rose-700 hover:bg-rose-50 hover:text-rose-900"
            }`}
          >
            <span>🚑</span>
            <span>Ambulance Fleet & GPS Console</span>
            {ambulanceAppointments.length > 0 && (
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-black text-rose-700 border border-rose-300 animate-pulse">
                {ambulanceAppointments.length}
              </span>
            )}
          </button>

          {/* Tab 3: Gate Triage & ER Mobilization */}
          <button
            type="button"
            onClick={() => handleTabChange("gate")}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all duration-200 ${
              activeTab === "gate"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-400/30"
                : "text-amber-800 hover:bg-amber-50 hover:text-amber-950"
            }`}
          >
            <span>🚪</span>
            <span>Gate Triage & ER Mobilization</span>
            {gateAppointments.length > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-800 border border-amber-300 animate-pulse">
                {gateAppointments.length}
              </span>
            )}
          </button>
        </div>

        {/* Global Trauma Alert Indicator & Siren / Case Controls */}
        <div className="flex items-center gap-3 px-3">
          {hasUnacceptedEmergency ? (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-3.5 py-1.5 text-xs font-black text-red-700 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                <span>{unacceptedEmergencies.length} UNACCEPTED RED ALERT</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleUpdateAppointmentStatus(unacceptedEmergencies[0].token, "In-Progress")
                }
                disabled={updatingToken === unacceptedEmergencies[0].token}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-black text-white shadow-md shadow-red-600/40 ring-2 ring-red-400 animate-pulse transition-all active:scale-95 disabled:opacity-50"
                title="Accept Emergency Case & Silence Siren"
              >
                <span>🚨</span>
                <span>{t("accept_case_btn")}</span>
              </button>
            </div>
          ) : inProgressEmergencies.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-300 px-3.5 py-1.5 text-xs font-black text-emerald-700">
                {t("case_handled_badge")}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleUpdateAppointmentStatus(inProgressEmergencies[0].token, "Completed")
                }
                disabled={updatingToken === inProgressEmergencies[0].token}
                className="inline-flex items-center gap-2 rounded-full bg-teal-600 hover:bg-teal-700 px-4 py-2 text-xs font-black text-white shadow-md shadow-teal-600/30 transition-all active:scale-95 disabled:opacity-50"
                title="Resolve & Complete Emergency Case"
              >
                <span>🩺</span>
                <span>{t("resolve_case_btn")}</span>
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/70 px-3.5 py-1.5 text-xs font-bold text-teal-800">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              <span>Trauma Standby Active</span>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DOCTOR CLINICAL TRIAGE                            */}
      {/* ======================================================== */}
      {activeTab === "doctor" && (
        <div className="animate-fadeIn">
          <DoctorAuthGuard>
            <DoctorQueueClient initialAppointments={appointments} />
          </DoctorAuthGuard>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: AMBULANCE FLEET & GPS CONSOLE                     */}
      {/* ======================================================== */}
      {activeTab === "ambulance" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Ambulance Fleet Header Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[2rem] border border-rose-100 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
              <span className="text-xs font-black uppercase tracking-wider text-rose-600">
                Active Fleet Units
              </span>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {ambulanceAppointments.length} Dispatched
              </p>
              <p className="mt-1 text-xs text-slate-500">Autonomous Level 4 Medical Transport</p>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
              <span className="text-xs font-black uppercase tracking-wider text-[#00A896]">
                Average Target ETA
              </span>
              <p className="mt-2 text-3xl font-black text-slate-900">~04:30 min</p>
              <p className="mt-1 text-xs text-slate-500">Autonomous Green-Corridor Clearance</p>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600">
                Telemetry & Guidance
              </span>
              <p className="mt-2 text-3xl font-black text-slate-900">GPS Lock Active</p>
              <p className="mt-1 text-xs text-slate-500">108 Emergency Backup Synchronized</p>
            </div>
          </div>

          {/* Ambulance Dispatch Cards */}
          {ambulanceAppointments.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 shadow-xs">
              <span className="text-4xl">🚑</span>
              <h3 className="mt-3 text-base font-bold text-slate-900">No Active Ambulance Dispatches</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                All autonomous fleet ambulances are currently on standby in the hospital trauma bays.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {ambulanceAppointments.map((apt) => {
                const isPickedUp = apt.status === "In-Consultation" || apt.status === "Completed";
                const loc =
                  apt.parsed_summary?.location ||
                  `${apt.parsed_summary?.latitude || "17.4435° N"}, ${apt.parsed_summary?.longitude || "78.3772° E"}`;
                const unit =
                  apt.parsed_summary?.unit_assigned || "Smart AV-Ambulance #MED-09";

                return (
                  <div
                    key={apt.token}
                    className="relative overflow-hidden rounded-[2rem] border-2 border-rose-200 bg-white p-6 text-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition hover:border-rose-300"
                  >
                    <div className="flex items-center justify-between border-b border-rose-100 pb-4">
                      <div>
                        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-rose-700 border border-rose-200">
                          {apt.token}
                        </span>
                        <h4 className="mt-2 text-base font-black text-slate-900">
                          {apt.patient_name}
                        </h4>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                          isPickedUp
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                            : "bg-rose-500 text-white animate-pulse"
                        }`}
                      >
                        {isPickedUp ? "Patient Picked Up" : "En Route to Accident Site"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 text-xs">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-500">Target Location:</span>
                        <span className="font-mono font-bold text-rose-700 text-right">{loc}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Assigned Fleet Vehicle:</span>
                        <span className="font-bold text-slate-900">{unit}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Trauma Response ETA:</span>
                        <span className="font-mono font-bold text-rose-600">
                          {apt.parsed_summary?.eta_mins || 5} mins
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Telemetry Logged:</span>
                        <span className="text-slate-600">{apt.created_at || "Live Broadcast"}</span>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                      <a
                        href="tel:108"
                        className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                      >
                        📞 Call 108 Driver
                      </a>

                      {!isPickedUp ? (
                        <button
                          type="button"
                          disabled={updatingToken === apt.token}
                          onClick={() => handleUpdateAppointmentStatus(apt.token, "In-Consultation")}
                          className="rounded-full bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 transition"
                        >
                          {updatingToken === apt.token ? "Updating..." : "✓ Confirm Patient Picked Up"}
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                          ✓ Patient Secured & In Transit
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: GATE TRIAGE & ER MOBILIZATION                     */}
      {/* ======================================================== */}
      {activeTab === "gate" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Gate Operations Header Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[2rem] border border-amber-100 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
              <span className="text-xs font-black uppercase tracking-wider text-amber-600">
                Inbound Gate Casualties
              </span>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {gateAppointments.length} Active Alerts
              </p>
              <p className="mt-1 text-xs text-slate-500">Private Vehicles & Taxis Inbound</p>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
              <span className="text-xs font-black uppercase tracking-wider text-[#00A896]">
                Gate 1 Staging Point
              </span>
              <p className="mt-2 text-3xl font-black text-slate-900">Entrance Standby</p>
              <p className="mt-1 text-xs text-slate-500">Triage Nurses & Stretchers Deployed</p>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600">
                Resuscitation Bay 1
              </span>
              <p className="mt-2 text-3xl font-black text-slate-900">Level 1 Ready</p>
              <p className="mt-1 text-xs text-slate-500">Crash Cart & Oxygen Active</p>
            </div>
          </div>

          {/* Gate Mobilization Cards */}
          {gateAppointments.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 shadow-xs">
              <span className="text-4xl">🚪</span>
              <h3 className="mt-3 text-base font-bold text-slate-900">No Inbound Self-Arrival Alerts</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                No private transport or incoming casualties currently flagged for Gate 1 mobilization.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {gateAppointments.map((apt) => {
                const isReceived = apt.status === "In-Consultation" || apt.status === "Completed";
                const notes =
                  apt.parsed_summary?.notes ||
                  apt.parsed_summary?.vehicle_notes ||
                  apt.symptoms?.replace(
                    "SELF ARRIVAL TRAUMA CASUALTY. ER Gate Staff Alerted. Vehicle Notes: ",
                    ""
                  ) ||
                  "Private Vehicle / Inbound";

                const checklist = gateChecklists[apt.token] || {
                  stretcher: true,
                  nurse: true,
                  bay: true,
                };

                return (
                  <div
                    key={apt.token}
                    className="relative overflow-hidden rounded-[2rem] border-2 border-amber-200 bg-white p-6 text-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition hover:border-amber-300"
                  >
                    <div className="flex items-center justify-between border-b border-amber-100 pb-4">
                      <div>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-800 border border-amber-200">
                          {apt.token}
                        </span>
                        <h4 className="mt-2 text-base font-black text-slate-900">
                          {apt.patient_name}
                        </h4>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                          isReceived
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                            : "bg-amber-500 text-slate-950 font-black animate-pulse"
                        }`}
                      >
                        {isReceived ? "Patient Received" : "Gate 1 Alert Active"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 text-xs">
                      {/* Vehicle & ETA Notes */}
                      <div className="rounded-2xl bg-amber-50/70 p-3.5 border border-amber-200/80">
                        <span className="text-[10px] uppercase font-bold text-amber-800">
                          Incoming Vehicle & ETA Notes
                        </span>
                        <p className="mt-1 font-mono font-bold text-amber-950 text-sm">
                          {notes}
                        </p>
                      </div>

                      {/* Nurse Stephanie Cutout Card */}
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-teal-50/70 border border-teal-100">
                        <div className="relative">
                          <img
                            src="https://images.unsplash.com/photo-1594824813583-490351543b37?auto=format&fit=crop&q=80&w=400"
                            alt="Nurse Stephanie"
                            className="h-11 w-11 rounded-full object-cover border-2 border-emerald-400 shadow-sm"
                            loading="lazy"
                          />
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Nurse Stephanie, RN</p>
                          <span className="text-[11px] font-semibold text-teal-700">Gate 1 Rapid Response Triage Lead · Active Standby</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Staging Location:</span>
                        <span className="font-bold text-slate-900">Main Hospital Entrance (Gate 1)</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Arrival Notification:</span>
                        <span className="text-slate-600">{apt.created_at || "Just Now"}</span>
                      </div>
                    </div>

                    {/* Interactive Checklist for Gate Staff */}
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                        Gate Ground Staff Checklist:
                      </span>
                      <div className="mt-2 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                          <input
                            type="checkbox"
                            checked={checklist.stretcher}
                            onChange={() => toggleGateChecklist(apt.token, "stretcher")}
                            className="rounded border-slate-300 bg-white text-amber-600 focus:ring-amber-500"
                          />
                          <span>Stretcher Deployed to Gate 1</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                          <input
                            type="checkbox"
                            checked={checklist.nurse}
                            onChange={() => toggleGateChecklist(apt.token, "nurse")}
                            className="rounded border-slate-300 bg-white text-amber-600 focus:ring-amber-500"
                          />
                          <span>Triage Nurse on Standby at Entrance</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                          <input
                            type="checkbox"
                            checked={checklist.bay}
                            onChange={() => toggleGateChecklist(apt.token, "bay")}
                            className="rounded border-slate-300 bg-white text-amber-600 focus:ring-amber-500"
                          />
                          <span>Trauma Resuscitation Bay 1 Prepared</span>
                        </label>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                      {!isReceived ? (
                        <button
                          type="button"
                          disabled={updatingToken === apt.token}
                          onClick={() => handleUpdateAppointmentStatus(apt.token, "In-Consultation")}
                          className="rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-2.5 text-xs font-black text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 transition"
                        >
                          {updatingToken === apt.token ? "Updating..." : "✓ Mark Patient Received at Gate"}
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                          ✓ Patient Admitted to ER Trauma Bay
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
