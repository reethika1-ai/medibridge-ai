"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DoctorQueueClient, { AppointmentItem, isRedAlert } from "@/components/DoctorQueueClient";

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
            if (isRedAlert(apt)) {
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

  const redAlertTotal = appointments.filter((a) => isRedAlert(a)).length;

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* MULTI-DEPARTMENT HIGH-DENSITY TAB NAVIGATION             */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-slate-800/90 bg-slate-900/90 p-2.5 backdrop-blur-md shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab 1: Doctor Clinical Triage */}
          <button
            type="button"
            onClick={() => handleTabChange("doctor")}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-extrabold transition-all duration-200 ${
              activeTab === "doctor"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/40"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span>🩺</span>
            <span>Doctor Clinical Triage</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                activeTab === "doctor" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {appointments.length}
            </span>
          </button>

          {/* Tab 2: Ambulance Fleet & GPS Console */}
          <button
            type="button"
            onClick={() => handleTabChange("ambulance")}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-extrabold transition-all duration-200 ${
              activeTab === "ambulance"
                ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400/40"
                : "text-rose-300 hover:bg-rose-950/40 hover:text-rose-100"
            }`}
          >
            <span>🚑</span>
            <span>Ambulance Fleet & GPS Console</span>
            {ambulanceAppointments.length > 0 && (
              <span className="rounded-full bg-rose-500/30 px-2 py-0.5 text-[10px] font-black text-rose-200 border border-rose-400/30 animate-pulse">
                {ambulanceAppointments.length}
              </span>
            )}
          </button>

          {/* Tab 3: Gate Triage & ER Mobilization */}
          <button
            type="button"
            onClick={() => handleTabChange("gate")}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-extrabold transition-all duration-200 ${
              activeTab === "gate"
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/30 ring-2 ring-amber-400/40"
                : "text-amber-300 hover:bg-amber-950/40 hover:text-amber-100"
            }`}
          >
            <span>🚪</span>
            <span>Gate Triage & ER Mobilization</span>
            {gateAppointments.length > 0 && (
              <span className="rounded-full bg-amber-500/30 px-2 py-0.5 text-[10px] font-black text-amber-200 border border-amber-400/30 animate-pulse">
                {gateAppointments.length}
              </span>
            )}
          </button>
        </div>

        {/* Global Trauma Alert Indicator & Siren Test Button */}
        <div className="flex items-center gap-3 px-3">
          {redAlertTotal > 0 && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/50 px-3 py-1.5 text-xs font-black text-red-200 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
              <span>{redAlertTotal} RED ALERT CASUALTIES</span>
            </div>
          )}

          {/* Two-tone Emergency Siren Test Button */}
          <button
            type="button"
            onClick={playEmergencySiren}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/50 bg-red-950/60 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-900/60 transition active:scale-95 shadow-sm"
            title="Test ER Hospital Siren (960 Hz <-> 770 Hz)"
          >
            <span className="animate-bounce">🔊</span>
            <span>Test ER Siren</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DOCTOR CLINICAL TRIAGE                            */}
      {/* ======================================================== */}
      {activeTab === "doctor" && (
        <div className="animate-fadeIn">
          <DoctorQueueClient initialAppointments={appointments} />
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: AMBULANCE FLEET & GPS CONSOLE                     */}
      {/* ======================================================== */}
      {activeTab === "ambulance" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Ambulance Fleet Header Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 p-5 shadow-xl">
              <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                Active Fleet Units
              </span>
              <p className="mt-2 text-3xl font-black text-white">
                {ambulanceAppointments.length} Dispatched
              </p>
              <p className="mt-1 text-xs text-slate-400">Autonomous Level 4 Medical Transport</p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                Average Target ETA
              </span>
              <p className="mt-2 text-3xl font-black text-white">~04:30 min</p>
              <p className="mt-1 text-xs text-slate-400">Autonomous Green-Corridor Clearance</p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Telemetry & Guidance
              </span>
              <p className="mt-2 text-3xl font-black text-white">GPS Lock Active</p>
              <p className="mt-1 text-xs text-slate-400">108 Emergency Backup Synchronized</p>
            </div>
          </div>

          {/* Ambulance Dispatch Cards */}
          {ambulanceAppointments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
              <span className="text-4xl">🚑</span>
              <h3 className="mt-3 text-base font-bold text-white">No Active Ambulance Dispatches</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
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
                    className="relative overflow-hidden rounded-3xl border-2 border-rose-500/60 bg-gradient-to-b from-slate-900 via-rose-950/20 to-slate-900 p-6 text-white shadow-2xl transition hover:border-rose-400"
                  >
                    <div className="flex items-center justify-between border-b border-rose-500/30 pb-4">
                      <div>
                        <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-rose-300 border border-rose-400/30">
                          {apt.token}
                        </span>
                        <h4 className="mt-2 text-base font-black text-white">
                          {apt.patient_name}
                        </h4>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                          isPickedUp
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-rose-500 text-white animate-pulse"
                        }`}
                      >
                        {isPickedUp ? "Patient Picked Up" : "En Route to Accident Site"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 text-xs">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-slate-400">Target Location:</span>
                        <span className="font-mono font-bold text-cyan-300 text-right">{loc}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Assigned Fleet Vehicle:</span>
                        <span className="font-bold text-white">{unit}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Trauma Response ETA:</span>
                        <span className="font-mono font-bold text-rose-400">
                          {apt.parsed_summary?.eta_mins || 5} mins
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Telemetry Logged:</span>
                        <span className="text-slate-300">{apt.created_at || "Live Broadcast"}</span>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
                      <a
                        href="tel:108"
                        className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white"
                      >
                        📞 Call 108 Driver
                      </a>

                      {!isPickedUp ? (
                        <button
                          type="button"
                          disabled={updatingToken === apt.token}
                          onClick={() => handleUpdateAppointmentStatus(apt.token, "In-Consultation")}
                          className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2 text-xs font-extrabold text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 transition"
                        >
                          {updatingToken === apt.token ? "Updating..." : "✓ Confirm Patient Picked Up"}
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
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
            <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 p-5 shadow-xl">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Inbound Gate Casualties
              </span>
              <p className="mt-2 text-3xl font-black text-white">
                {gateAppointments.length} Active Alerts
              </p>
              <p className="mt-1 text-xs text-slate-400">Private Vehicles & Taxis Inbound</p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                Gate 1 Staging Point
              </span>
              <p className="mt-2 text-3xl font-black text-white">Entrance Standby</p>
              <p className="mt-1 text-xs text-slate-400">Triage Nurses & Stretchers Deployed</p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Resuscitation Bay 1
              </span>
              <p className="mt-2 text-3xl font-black text-white">Level 1 Ready</p>
              <p className="mt-1 text-xs text-slate-400">Crash Cart & Oxygen Active</p>
            </div>
          </div>

          {/* Gate Mobilization Cards */}
          {gateAppointments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
              <span className="text-4xl">🚪</span>
              <h3 className="mt-3 text-base font-bold text-white">No Inbound Self-Arrival Alerts</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
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
                    className="relative overflow-hidden rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-slate-900 via-amber-950/20 to-slate-900 p-6 text-white shadow-2xl transition hover:border-amber-400"
                  >
                    <div className="flex items-center justify-between border-b border-amber-500/30 pb-4">
                      <div>
                        <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300 border border-amber-400/30">
                          {apt.token}
                        </span>
                        <h4 className="mt-2 text-base font-black text-white">
                          {apt.patient_name}
                        </h4>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                          isReceived
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-amber-500 text-slate-950 animate-pulse"
                        }`}
                      >
                        {isReceived ? "Patient Received" : "Gate 1 Alert Active"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 text-xs">
                      <div className="rounded-2xl bg-black/50 p-3.5 border border-amber-500/30">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Incoming Vehicle & ETA Notes
                        </span>
                        <p className="mt-1 font-mono font-bold text-amber-300 text-sm">
                          {notes}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Staging Location:</span>
                        <span className="font-bold text-white">Main Hospital Entrance (Gate 1)</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Arrival Notification:</span>
                        <span className="text-slate-300">{apt.created_at || "Just Now"}</span>
                      </div>
                    </div>

                    {/* Interactive Checklist for Gate Staff */}
                    <div className="mt-4 rounded-2xl bg-slate-950/70 p-4 border border-slate-800 text-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                        Gate Ground Staff Checklist:
                      </span>
                      <div className="mt-2 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                          <input
                            type="checkbox"
                            checked={checklist.stretcher}
                            onChange={() => toggleGateChecklist(apt.token, "stretcher")}
                            className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                          />
                          <span>Stretcher Deployed to Gate 1</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                          <input
                            type="checkbox"
                            checked={checklist.nurse}
                            onChange={() => toggleGateChecklist(apt.token, "nurse")}
                            className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                          />
                          <span>Triage Nurse on Standby at Entrance</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                          <input
                            type="checkbox"
                            checked={checklist.bay}
                            onChange={() => toggleGateChecklist(apt.token, "bay")}
                            className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                          />
                          <span>Trauma Resuscitation Bay 1 Prepared</span>
                        </label>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                      {!isReceived ? (
                        <button
                          type="button"
                          disabled={updatingToken === apt.token}
                          onClick={() => handleUpdateAppointmentStatus(apt.token, "In-Consultation")}
                          className="rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-5 py-2.5 text-xs font-black text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 transition"
                        >
                          {updatingToken === apt.token ? "Updating..." : "✓ Mark Patient Received at Gate"}
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
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
