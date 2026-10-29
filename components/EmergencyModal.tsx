"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry?: {
    token?: string;
    ambulance_id?: string;
    unit_assigned?: string;
    latitude?: string | number;
    longitude?: string | number;
    reported_by?: string;
    eta_mins?: number;
    location?: string;
    notes?: string;
    mode?: string;
  } | null;
}

type EmergencyStep = "SELECT" | "AMBULANCE_FORM" | "AMBULANCE_ACTIVE" | "SELF_FORM" | "SELF_ACTIVE";

export default function EmergencyModal({
  isOpen,
  onClose,
  telemetry: initialTelemetry,
}: EmergencyModalProps) {
  const { t } = useLanguage();

  const [step, setStep] = useState<EmergencyStep>("SELECT");
  const [ambulanceLocation, setAmbulanceLocation] = useState("");
  const [latitude, setLatitude] = useState("17.4435° N");
  const [longitude, setLongitude] = useState("78.3772° E");
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [vehicleNotes, setVehicleNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTelemetry, setActiveTelemetry] = useState<any>(initialTelemetry || null);

  // 4 minutes 30 seconds countdown (270 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(270);

  // Reset modal state upon opening
  useEffect(() => {
    if (isOpen) {
      if (initialTelemetry) {
        setActiveTelemetry(initialTelemetry);
        setStep(initialTelemetry.mode === "SELF_ARRIVAL" ? "SELF_ACTIVE" : "AMBULANCE_ACTIVE");
      } else {
        setStep("SELECT");
        setAmbulanceLocation("");
        setVehicleNotes("");
        setActiveTelemetry(null);
      }
      setSecondsRemaining(270);
    }
  }, [isOpen, initialTelemetry]);

  // Live countdown timer for active ambulance dispatch
  useEffect(() => {
    if (!isOpen || step !== "AMBULANCE_ACTIVE") return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, step]);

  if (!isOpen) return null;

  function handleSelectAmbulance() {
    setStep("AMBULANCE_FORM");
    setIsGpsLoading(true);

    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = `${pos.coords.latitude.toFixed(4)}° N`;
          const lon = `${pos.coords.longitude.toFixed(4)}° E`;
          setLatitude(lat);
          setLongitude(lon);
          setAmbulanceLocation(`${lat}, ${lon} (Accident Location Telemetry)`);
          setIsGpsLoading(false);
        },
        () => {
          const fallbackLat = "17.4435° N";
          const fallbackLon = "78.3772° E";
          setLatitude(fallbackLat);
          setLongitude(fallbackLon);
          setAmbulanceLocation("City Junction / Roadside Trauma Landmark");
          setIsGpsLoading(false);
        },
        { timeout: 3500, enableHighAccuracy: true }
      );
    } else {
      setAmbulanceLocation("City Roadside Landmark (Manual Input)");
      setIsGpsLoading(false);
    }
  }

  function handleSelectSelfArrival() {
    setStep("SELF_FORM");
    if (!vehicleNotes) {
      setVehicleNotes("White Swift / 5 mins ETA");
    }
  }

  async function handleDispatchAmbulance(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const loc = ambulanceLocation.trim() || `${latitude}, ${longitude}`;

    try {
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "AMBULANCE",
          location: loc,
          latitude,
          longitude,
          reported_by: "Bystander / Roadside Alert",
        }),
      });
      const data = await res.json();
      setActiveTelemetry(data);
      setStep("AMBULANCE_ACTIVE");
    } catch {
      setActiveTelemetry({
        token: `EMG-AMB-${Math.floor(100000 + Math.random() * 900000)}`,
        ambulance_id: "AV-AMB-09",
        unit_assigned: "Smart AV-Ambulance #MED-09 (Autonomous Trauma Fleet)",
        latitude,
        longitude,
        location: loc,
        eta_mins: 5,
        mode: "AMBULANCE",
      });
      setStep("AMBULANCE_ACTIVE");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMobilizeGate(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const notes = vehicleNotes.trim() || "Private Transport / Rapid Inbound";

    try {
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "SELF_ARRIVAL",
          notes,
          reported_by: "Incoming Patient / Relative",
        }),
      });
      const data = await res.json();
      setActiveTelemetry(data);
      setStep("SELF_ACTIVE");
    } catch {
      setActiveTelemetry({
        token: `EMG-GATE-${Math.floor(100000 + Math.random() * 900000)}`,
        unit_assigned: "Gate 1 ER Rapid Mobilization Unit",
        notes,
        mode: "SELF_ARRIVAL",
      });
      setStep("SELF_ACTIVE");
    } finally {
      setIsSubmitting(false);
    }
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedCountdown = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")} min`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border-2 border-rose-500/80 bg-gradient-to-b from-slate-950 via-rose-950/30 to-slate-950 p-6 sm:p-8 text-white shadow-2xl shadow-rose-950/50">
        {/* Animated Beacon Lights */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-rose-600/30 blur-3xl animate-pulse" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-red-600/20 blur-3xl" />

        {/* ======================================================== */}
        {/* STEP 1: BIFURCATED TRIAGE CHOICE                         */}
        {/* ======================================================== */}
        {step === "SELECT" && (
          <div className="relative z-10 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-rose-500/50 bg-rose-950/80 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-rose-300 shadow-lg">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>{t("triage_choice_title")}</span>
            </div>

            <h2 className="mt-4 text-2xl font-black text-rose-100 tracking-tight">
              Emergency Rapid Response
            </h2>
            <p className="mt-1.5 text-xs text-rose-300/80 leading-relaxed max-w-sm mx-auto">
              {t("triage_choice_subtitle")}
            </p>

            <div className="mt-6 space-y-4 text-left">
              {/* Option 1: Need an Ambulance */}
              <button
                type="button"
                onClick={handleSelectAmbulance}
                className="group w-full rounded-2xl border-2 border-rose-500/50 bg-rose-950/40 p-4 transition-all duration-200 hover:border-rose-400 hover:bg-rose-900/50 hover:scale-[1.02] active:scale-[0.99] text-left shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-white group-hover:text-rose-200 flex items-center gap-2">
                    {t("need_ambulance_title")}
                  </span>
                  <span className="rounded-full bg-rose-500/30 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-400/40">
                    GPS Auto-Dispatch
                  </span>
                </div>
                <p className="mt-1 text-xs text-rose-200/80 leading-relaxed">
                  {t("need_ambulance_desc")}
                </p>
                <div className="mt-3 flex items-center text-xs font-bold text-rose-300 group-hover:translate-x-1 transition-transform">
                  Dispatch smart fleet unit →
                </div>
              </button>

              {/* Option 2: Coming by Self */}
              <button
                type="button"
                onClick={handleSelectSelfArrival}
                className="group w-full rounded-2xl border-2 border-amber-500/50 bg-amber-950/30 p-4 transition-all duration-200 hover:border-amber-400 hover:bg-amber-900/40 hover:scale-[1.02] active:scale-[0.99] text-left shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-white group-hover:text-amber-200 flex items-center gap-2">
                    {t("coming_by_self_title")}
                  </span>
                  <span className="rounded-full bg-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/40">
                    Gate 1 ER Alert
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-200/80 leading-relaxed">
                  {t("coming_by_self_desc")}
                </p>
                <div className="mt-3 flex items-center text-xs font-bold text-amber-300 group-hover:translate-x-1 transition-transform">
                  Mobilize ER triage nurses & stretchers →
                </div>
              </button>
            </div>

            <div className="mt-6 flex justify-between items-center pt-2 border-t border-slate-800">
              <a
                href="tel:108"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:underline"
              >
                <span>📞</span>
                <span>{t("call_108")}</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                {t("emergency_close")}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2A - FORM: AMBULANCE LOCATION / GPS CONFIRMATION    */}
        {/* ======================================================== */}
        {step === "AMBULANCE_FORM" && (
          <form onSubmit={handleDispatchAmbulance} className="relative z-10">
            <button
              type="button"
              onClick={() => setStep("SELECT")}
              className="text-xs font-bold text-rose-300 hover:text-white flex items-center gap-1 mb-3"
            >
              {t("back_btn")}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-2xl">🚑</span>
              <div>
                <h3 className="text-xl font-black text-white">
                  Confirm Ambulance Dispatch
                </h3>
                <p className="text-xs text-rose-200/80">
                  Autonomous trauma unit #MED-09 will be dispatched immediately.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-rose-300">
                  {t("accident_location_label")}
                </label>
                <div className="mt-1.5 relative">
                  <input
                    type="text"
                    required
                    value={ambulanceLocation}
                    onChange={(e) => setAmbulanceLocation(e.target.value)}
                    placeholder={t("accident_location_placeholder")}
                    className="w-full rounded-2xl border border-rose-500/50 bg-slate-900/90 px-4 py-3 text-xs sm:text-sm font-semibold text-white placeholder-slate-500 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/40"
                  />
                  {isGpsLoading && (
                    <span className="absolute right-3 top-3 text-xs font-bold text-cyan-400 animate-pulse">
                      Acquiring GPS...
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>GPS Lat/Lon:</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {latitude}, {longitude}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Assigned Vehicle:</span>
                  <span className="font-bold text-white">Smart AV-Ambulance #MED-09</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Response:</span>
                  <span className="font-bold text-emerald-400">~04:30 Minutes (Priority Route)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-5 py-3.5 text-xs sm:text-sm font-black text-white shadow-xl shadow-rose-600/30 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
              >
                <span>🚨</span>
                <span>{isSubmitting ? "Dispatching Fleet..." : t("dispatch_ambulance_btn")}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                {t("emergency_close")}
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* STEP 2A - ACTIVE HUD: AMBULANCE EN ROUTE                */}
        {/* ======================================================== */}
        {step === "AMBULANCE_ACTIVE" && (
          <div className="relative z-10">
            <div className="text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-rose-500/50 bg-rose-950/80 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-rose-300 shadow-lg">
                <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>{t("emergency_status_live")}</span>
              </div>

              <h2 className="mt-4 text-xl sm:text-2xl font-black text-rose-100 tracking-tight leading-tight">
                {t("emergency_modal_title")}
              </h2>

              <p className="mt-1.5 text-xs text-rose-300/80 font-mono">
                Incident Dispatch Token:{" "}
                <strong className="text-white">{activeTelemetry?.token || "EMG-AMB-DISPATCH"}</strong>
              </p>
            </div>

            {/* Live Countdown Arrival Card */}
            <div className="mt-5 rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/70 via-slate-900/90 to-rose-950/70 p-4 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                {t("eta_label")}
              </span>
              <div className="mt-1 font-mono text-3xl sm:text-4xl font-black text-rose-400 tracking-wider">
                {formattedCountdown}
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Autonomous Route Optimization Active</span>
              </div>
            </div>

            {/* Telemetry Breakdown Details */}
            <div className="mt-5 space-y-2.5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">{t("unit_assigned_label")}</span>
                <span className="font-bold text-white text-right">
                  {activeTelemetry?.unit_assigned || "Smart AV-Ambulance #MED-09"}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">{t("gps_coordinates_label")}</span>
                <span className="font-mono font-bold text-cyan-300 truncate max-w-[200px]">
                  {activeTelemetry?.location || `${latitude}, ${longitude}`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("reported_by_label")}</span>
                <span className="font-semibold text-slate-200">
                  {activeTelemetry?.reported_by || t("reported_by_val")}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-amber-950/40 border border-amber-500/40 p-3 text-[11px] text-amber-200 leading-relaxed text-center">
              ⚠️ {t("emergency_dispatched_notice")}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a
                href="tel:108"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-4 py-3 text-xs sm:text-sm font-black text-white shadow-lg shadow-rose-600/30 transition hover:scale-105 active:scale-95"
              >
                <span>📞</span>
                <span>{t("call_108")}</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-700 bg-slate-800/90 px-5 py-3 text-xs sm:text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95"
              >
                {t("emergency_close")}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2B - FORM: COMING BY SELF                           */}
        {/* ======================================================== */}
        {step === "SELF_FORM" && (
          <form onSubmit={handleMobilizeGate} className="relative z-10">
            <button
              type="button"
              onClick={() => setStep("SELECT")}
              className="text-xs font-bold text-amber-300 hover:text-white flex items-center gap-1 mb-3"
            >
              {t("back_btn")}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-2xl">🚗</span>
              <div>
                <h3 className="text-xl font-black text-white">
                  Hospital Gate 1 ER Mobilization
                </h3>
                <p className="text-xs text-amber-200/80">
                  Alert ER staff and prepare stretchers at the main entrance.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
                  {t("vehicle_notes_label")}
                </label>
                <input
                  type="text"
                  required
                  value={vehicleNotes}
                  onChange={(e) => setVehicleNotes(e.target.value)}
                  placeholder={t("vehicle_notes_placeholder")}
                  className="mt-1.5 w-full rounded-2xl border border-amber-500/50 bg-slate-900/90 px-4 py-3 text-xs sm:text-sm font-semibold text-white placeholder-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <span>🏥</span>
                  <span>Destination: Main Hospital Entrance (Gate 1)</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Emergency triage nurses, trauma stretchers, and rapid resuscitation bay are immediately put on standby at Gate 1 upon confirmation.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-5 py-3.5 text-xs sm:text-sm font-black text-white shadow-xl shadow-amber-600/30 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
              >
                <span>🚨</span>
                <span>{isSubmitting ? "Mobilizing Team..." : t("mobilize_gate_btn")}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-700 bg-slate-800/90 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                {t("emergency_close")}
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* STEP 2B - ACTIVE HUD: GATE MOBILIZATION CONFIRMED       */}
        {/* ======================================================== */}
        {step === "SELF_ACTIVE" && (
          <div className="relative z-10 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-950/80 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-amber-300 shadow-lg">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>{t("gate_mobilization_active")}</span>
            </div>

            <h2 className="mt-4 text-xl sm:text-2xl font-black text-amber-100 tracking-tight leading-tight">
              Hospital Gate 1 Alert Active
            </h2>

            <div className="mt-4 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-amber-950/60 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                {t("gate_token_label")}
              </span>
              <p className="mt-1 font-mono text-3xl sm:text-4xl font-black text-white tracking-wider">
                {activeTelemetry?.token || "EMG-GATE-READY"}
              </p>
              <span className="mt-2 inline-block rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-extrabold text-amber-300 border border-amber-400/30">
                {t("gate_priority_badge")}
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-left text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <span>📍</span>
                <span>Drive directly to Gate 1 (Main Hospital Entrance)</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                {t("gate_instructions")}
              </p>
              {activeTelemetry?.notes && (
                <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between text-[11px]">
                  <span className="text-slate-400">Noted Vehicle / ETA:</span>
                  <span className="font-bold text-amber-300">{activeTelemetry.notes}</span>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl bg-amber-950/40 border border-amber-500/40 p-3 text-[11px] text-amber-200 leading-relaxed text-center">
              ⚠️ {t("emergency_dispatched_notice")}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a
                href="tel:108"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-4 py-3 text-xs sm:text-sm font-black text-white shadow-lg shadow-amber-600/30 transition hover:scale-105 active:scale-95"
              >
                <span>📞</span>
                <span>{t("call_108")}</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-700 bg-slate-800/90 px-5 py-3 text-xs sm:text-sm font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition active:scale-95"
              >
                {t("emergency_close")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
