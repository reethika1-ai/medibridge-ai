"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: {
    token?: string;
    ambulance_id?: string;
    unit_assigned?: string;
    latitude?: string | number;
    longitude?: string | number;
    reported_by?: string;
    eta_mins?: number;
  } | null;
}

export default function EmergencyModal({
  isOpen,
  onClose,
  telemetry,
}: EmergencyModalProps) {
  const { t } = useLanguage();
  // 4 minutes 30 seconds countdown (270 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(270);

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(270);
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedCountdown = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")} min`;

  const lat = telemetry?.latitude || "17.4435° N";
  const lon = telemetry?.longitude || "78.3772° E";
  const unit =
    telemetry?.unit_assigned || "Smart AV-Ambulance #MED-09 (Autonomous Trauma Fleet)";
  const token = telemetry?.token || "EMG-TRAUMA";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border-2 border-rose-500/80 bg-gradient-to-b from-slate-950 via-rose-950/30 to-slate-950 p-6 sm:p-8 text-white shadow-2xl shadow-rose-950/50">
        {/* Animated Beacon Light */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-rose-600/30 blur-3xl animate-pulse" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-red-600/20 blur-3xl" />

        {/* Header Alert Badge */}
        <div className="relative z-10 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-rose-500/50 bg-rose-950/80 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-rose-300 shadow-lg">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>{t("emergency_status_live")}</span>
          </div>

          <h2 className="mt-4 text-xl sm:text-2xl font-black text-rose-100 tracking-tight leading-tight">
            {t("emergency_modal_title")}
          </h2>

          <p className="mt-1.5 text-xs text-rose-300/80 font-mono">
            Incident Dispatch Token: <strong className="text-white">{token}</strong>
          </p>
        </div>

        {/* Live Countdown Arrival Card */}
        <div className="relative z-10 mt-6 rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/70 via-slate-900/90 to-rose-950/70 p-4 text-center">
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
        <div className="relative z-10 mt-5 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-slate-400">{t("unit_assigned_label")}</span>
            <span className="font-bold text-white text-right">{unit}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-slate-400">{t("gps_coordinates_label")}</span>
            <span className="font-mono font-bold text-cyan-300">
              {lat}, {lon}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">{t("reported_by_label")}</span>
            <span className="font-semibold text-slate-200">
              {t("reported_by_val")}
            </span>
          </div>
        </div>

        <div className="relative z-10 mt-4 rounded-xl bg-amber-950/40 border border-amber-500/40 p-3 text-[11px] text-amber-200 leading-relaxed text-center">
          ⚠️ {t("emergency_dispatched_notice")}
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 mt-6 flex flex-col sm:flex-row gap-3">
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
    </div>
  );
}

