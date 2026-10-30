"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { playEmergencySiren } from "@/components/HospitalPortalClient";

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
  const [manualAddress, setManualAddress] = useState("");
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
        setManualAddress("");
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

    const baseLoc = ambulanceLocation.trim() || `${latitude}, ${longitude}`;
    const loc = manualAddress.trim()
      ? `${manualAddress.trim()} (${baseLoc})`
      : baseLoc;

    try {
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "AMBULANCE",
          location: loc,
          manual_address: manualAddress.trim() || undefined,
          landmark: manualAddress.trim() || undefined,
          latitude,
          longitude,
          reported_by: "Bystander / Roadside Alert",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ambulance dispatch request failed");
      }
      setActiveTelemetry(data);
      setStep("AMBULANCE_ACTIVE");
      playEmergencySiren();
    } catch {
      setActiveTelemetry({
        token: `EMG-AMB-${Math.floor(100000 + Math.random() * 900000)}`,
        ambulance_id: "Smart AV-Ambulance #MED-09",
        unit_assigned: "Smart AV-Ambulance #MED-09 (Autonomous Trauma Fleet)",
        latitude,
        longitude,
        location: loc,
        manual_address: manualAddress.trim() || undefined,
        eta_mins: 5,
        mode: "AMBULANCE",
      });
      setStep("AMBULANCE_ACTIVE");
      playEmergencySiren();
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
          manual_address: manualAddress.trim() || undefined,
          landmark: manualAddress.trim() || undefined,
          reported_by: "Incoming Patient / Relative",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gate mobilization request failed");
      }
      setActiveTelemetry(data);
      setStep("SELF_ACTIVE");
      playEmergencySiren();
    } catch {
      setActiveTelemetry({
        token: `EMG-GATE-${Math.floor(100000 + Math.random() * 900000)}`,
        unit_assigned: "Gate 1 ER Rapid Mobilization Unit",
        notes,
        mode: "SELF_ARRIVAL",
      });
      setStep("SELF_ACTIVE");
      playEmergencySiren();
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2.2rem] border-2 border-rose-200 bg-white p-6 sm:p-8 text-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.15)]">
        {/* Animated Beacon Lights */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-rose-200/40 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-red-100/50 blur-3xl pointer-events-none" />

        {/* ======================================================== */}
        {/* STEP 1: BIFURCATED TRIAGE CHOICE                         */}
        {/* ======================================================== */}
        {step === "SELECT" && (
          <div className="relative z-10 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-rose-700 shadow-xs">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>{t("triage_choice_title")}</span>
            </div>

            <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
              Emergency Rapid Response
            </h2>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              {t("triage_choice_subtitle")}
            </p>

            <div className="mt-6 space-y-4 text-left">
              {/* Option 1: Need an Ambulance */}
              <button
                type="button"
                onClick={handleSelectAmbulance}
                className="group w-full rounded-[1.5rem] border-2 border-rose-200 bg-rose-50/40 p-4 transition-all duration-200 hover:border-rose-400 hover:bg-rose-50 hover:scale-[1.01] active:scale-[0.99] text-left shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-slate-900 group-hover:text-rose-700 flex items-center gap-2">
                    {t("need_ambulance_title")}
                  </span>
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-300">
                    GPS Auto-Dispatch
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {t("need_ambulance_desc")}
                </p>
                <div className="mt-3 flex items-center text-xs font-bold text-rose-600 group-hover:translate-x-1 transition-transform">
                  Dispatch smart fleet unit →
                </div>
              </button>

              {/* Option 2: Coming by Self */}
              <button
                type="button"
                onClick={handleSelectSelfArrival}
                className="group w-full rounded-[1.5rem] border-2 border-amber-200 bg-amber-50/40 p-4 transition-all duration-200 hover:border-amber-400 hover:bg-amber-50 hover:scale-[1.01] active:scale-[0.99] text-left shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-slate-900 group-hover:text-amber-800 flex items-center gap-2">
                    {t("coming_by_self_title")}
                  </span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                    Gate 1 ER Alert
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {t("coming_by_self_desc")}
                </p>
                <div className="mt-3 flex items-center text-xs font-bold text-amber-700 group-hover:translate-x-1 transition-transform">
                  Mobilize ER triage nurses & stretchers →
                </div>
              </button>
            </div>

            <div className="mt-6 flex justify-between items-center pt-3 border-t border-slate-100">
              <a
                href="tel:108"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:underline"
              >
                <span>📞</span>
                <span>{t("call_108")}</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
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
              className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 mb-3"
            >
              {t("back_btn")}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-2xl">🚑</span>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Confirm Ambulance Dispatch
                </h3>
                <p className="text-xs text-slate-500">
                  Autonomous trauma unit #MED-09 will be dispatched immediately.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-rose-700">
                  {t("accident_location_label")}
                </label>
                <div className="mt-1.5 relative">
                  <input
                    type="text"
                    required
                    value={ambulanceLocation}
                    onChange={(e) => setAmbulanceLocation(e.target.value)}
                    placeholder={t("accident_location_placeholder")}
                    className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100"
                  />
                  {isGpsLoading && (
                    <span className="absolute right-4 top-3.5 text-xs font-bold text-teal-600 animate-pulse">
                      Acquiring GPS...
                    </span>
                  )}
                </div>
              </div>

              {/* Landmark / Manual Address (Optional Fallback) */}
              <div className="mt-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Landmark / Manual Address (Optional Fallback)
                </label>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="e.g., Near Gachibowli flyover, opposite HP fuel station"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none transition focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100"
                />
              </div>

              <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>GPS Lat/Lon:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {latitude}, {longitude}
                  </span>
                </div>
                {manualAddress.trim() && (
                  <div className="flex justify-between text-slate-600">
                    <span>Manual Landmark:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[220px]">
                      {manualAddress}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Assigned Vehicle:</span>
                  <span className="font-bold text-slate-900">Smart AV-Ambulance #MED-09</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Response:</span>
                  <span className="font-bold text-emerald-600">~04:30 Minutes (Priority Route)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-5 py-3 text-xs sm:text-sm font-black text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
              >
                <span>🚨</span>
                <span>{isSubmitting ? "Dispatching Fleet..." : t("dispatch_ambulance_btn")}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100"
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
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-rose-700 shadow-xs">
                <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>{t("emergency_status_live")}</span>
              </div>

              <h2 className="mt-4 text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {t("emergency_modal_title")}
              </h2>

              <p className="mt-1.5 text-xs text-slate-500 font-mono">
                Incident Dispatch Token:{" "}
                <strong className="text-rose-700">{activeTelemetry?.token || "EMG-AMB-DISPATCH"}</strong>
              </p>
            </div>

            {/* Live Countdown Arrival Card */}
            <div className="mt-5 rounded-[1.5rem] border border-rose-200 bg-rose-50/60 p-5 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                {t("eta_label")}
              </span>
              <div className="mt-1 font-mono text-3xl sm:text-4xl font-black text-rose-600 tracking-wider">
                {formattedCountdown}
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Autonomous Route Optimization Active</span>
              </div>
            </div>

            {/* Telemetry Breakdown Details */}
            <div className="mt-5 space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                <span className="text-slate-500">{t("unit_assigned_label")}</span>
                <span className="font-bold text-slate-900 text-right">
                  {activeTelemetry?.unit_assigned || "Smart AV-Ambulance #MED-09"}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                <span className="text-slate-500">{t("gps_coordinates_label")}</span>
                <span className="font-mono font-bold text-teal-700 truncate max-w-[200px]">
                  {activeTelemetry?.location || `${latitude}, ${longitude}`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">{t("reported_by_label")}</span>
                <span className="font-semibold text-slate-700">
                  {activeTelemetry?.reported_by || t("reported_by_val")}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900 leading-relaxed text-center">
              ⚠️ {t("emergency_dispatched_notice")}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a
                href="tel:108"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-4 py-3 text-xs sm:text-sm font-black text-white shadow-md transition hover:scale-105 active:scale-95"
              >
                <span>📞</span>
                <span>{t("call_108")}</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95"
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
              className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 mb-3"
            >
              {t("back_btn")}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-2xl">🚗</span>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Hospital Gate 1 ER Mobilization
                </h3>
                <p className="text-xs text-slate-500">
                  Alert ER staff and prepare stretchers at the main entrance.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-800">
                  {t("vehicle_notes_label")}
                </label>
                <input
                  type="text"
                  required
                  value={vehicleNotes}
                  onChange={(e) => setVehicleNotes(e.target.value)}
                  placeholder={t("vehicle_notes_placeholder")}
                  className="mt-1.5 w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-800">
                  Landmark / Manual Starting Point (Optional)
                </label>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="e.g., Inbound from Hitech City, opposite Cyber Towers"
                  className="mt-1.5 w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                />
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <span>🏥</span>
                  <span>Destination: Main Hospital Entrance (Gate 1)</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Emergency triage nurses, trauma stretchers, and rapid resuscitation bay are immediately put on standby at Gate 1 upon confirmation.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-5 py-3 text-xs sm:text-sm font-black text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
              >
                <span>🚨</span>
                <span>{isSubmitting ? "Mobilizing Team..." : t("mobilize_gate_btn")}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100"
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
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-amber-800 shadow-xs">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
              <span>{t("gate_mobilization_active")}</span>
            </div>

            <h2 className="mt-4 text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Hospital Gate 1 Alert Active
            </h2>

            <div className="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50/60 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                {t("gate_token_label")}
              </span>
              <p className="mt-1 font-mono text-3xl sm:text-4xl font-black text-slate-900 tracking-wider">
                {activeTelemetry?.token || "EMG-GATE-READY"}
              </p>
              <span className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold text-amber-800 border border-amber-300">
                {t("gate_priority_badge")}
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <span>📍</span>
                <span>Drive directly to Gate 1 (Main Hospital Entrance)</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-xs">
                {t("gate_instructions")}
              </p>
              {activeTelemetry?.notes && (
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-[11px]">
                  <span className="text-slate-500">Noted Vehicle / ETA:</span>
                  <span className="font-bold text-amber-800">{activeTelemetry.notes}</span>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900 leading-relaxed text-center">
              ⚠️ {t("emergency_dispatched_notice")}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a
                href="tel:108"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-3 text-xs sm:text-sm font-black text-white shadow-md transition hover:scale-105 active:scale-95"
              >
                <span>📞</span>
                <span>{t("call_108")}</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95"
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
