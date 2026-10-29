"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

function TokenScreenContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "MB-743721";
  const name = searchParams.get("name") || "Patient";
  const department = searchParams.get("dept") || "General Medicine";
  const doctor = searchParams.get("doctor") || "Attending Physician";
  const date = searchParams.get("date") || "Scheduled Date";
  const time = searchParams.get("time") || "Scheduled Time";

  const [copied, setCopied] = useState(false);
  const [queueInfo, setQueueInfo] = useState<{
    queue_position: number;
    slot_total: number;
    consultation_eta: string;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    async function loadQueueInfo() {
      try {
        const res = await fetch(`/api/appointment/slot-availability?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.ok) {
            setQueueInfo({
              queue_position: json.queue_position || 1,
              slot_total: json.slot_total || 1,
              consultation_eta: json.consultation_eta || time,
            });
          }
        }
      } catch (err) {
        console.warn("Could not load queue info:", err);
      }
    }
    loadQueueInfo();
  }, [token, time]);

  function copyToken() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-blue-50/40 to-indigo-50/30 text-slate-900 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        {/* Decorative Sparkle / Confetti-Style Gradient Border */}
        <div className="relative rounded-[2rem] bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 p-[2px] shadow-2xl shadow-blue-500/20">
          <div className="rounded-[calc(2rem-2px)] bg-white p-7 text-center sm:p-11">
            {/* Success Icon Badge with Pulse Ring */}
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30">
              <svg
                className="h-10 w-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.8}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex h-4 w-4 rounded-full bg-cyan-500"></span>
              </span>
            </div>

            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-black text-emerald-800 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Appointment Confirmed · Saved in Supabase
            </div>

            <h1 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
              Your Consultation Token
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Please take a screenshot or copy this token. It links your medical reports, triage status, and queue position.
            </p>

            {/* Interactive "Copy Token" Elevated Card */}
            <div
              onClick={copyToken}
              className="group relative mt-8 cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-blue-300 bg-gradient-to-tr from-blue-50/70 via-indigo-50/50 to-white p-6 sm:p-8 transition-all duration-300 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 active:scale-98"
            >
              <span className="text-[11px] font-black uppercase tracking-widest text-blue-700">
                Official Token Identifier
              </span>

              <div className="mt-2 flex items-center justify-center gap-3">
                <span className="font-mono text-4xl sm:text-6xl font-black tracking-wider text-slate-900 group-hover:text-blue-700 transition-colors">
                  {token}
                </span>
                <span
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                    copied
                      ? "bg-emerald-600 text-white shadow-md"
                      : "bg-white text-blue-700 border border-blue-200 shadow-xs group-hover:bg-blue-600 group-hover:text-white"
                  }`}
                >
                  {copied ? "✓ Copied!" : "📋 Click to Copy"}
                </span>
              </div>

              {/* Slot Queue Position & Consultation ETA */}
              <div className="mt-5 rounded-2xl bg-white/90 p-3.5 border border-blue-200/80 shadow-xs text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🎟️</span>
                    <span>Queue Spot</span>
                  </span>
                  <span className="rounded-full bg-blue-600 text-white px-3 py-0.5 text-xs font-black shadow-xs">
                    Queue Spot: #{queueInfo?.queue_position || 1} of 8 in this slot
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-blue-100 pt-2 text-xs">
                  <span className="text-slate-600 font-semibold flex items-center gap-1">
                    <span>⏱️</span>
                    <span>Estimated Consultation Time:</span>
                  </span>
                  <span className="font-mono font-black text-blue-700 text-sm">
                    {queueInfo?.consultation_eta || time}
                  </span>
                </div>
              </div>

              {/* Consultation Details Grid */}
              <div className="mt-7 grid grid-cols-2 gap-4 border-t border-blue-200/60 pt-6 text-left text-xs sm:text-sm">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Patient:</span>
                  <p className="font-bold text-slate-900">{name}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Department:</span>
                  <p className="font-bold text-slate-900">{department}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Attending Physician:</span>
                  <p className="font-bold text-slate-900">{doctor}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Schedule:</span>
                  <p className="font-bold text-slate-900">
                    {date} ({time})
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 space-y-3">
              <Link
                href={`/patient-details?token=${encodeURIComponent(token)}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-4 text-base font-extrabold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-blue-500/35 active:scale-98"
              >
                <span>Upload Medical Reports & Symptoms</span>
                <span className="text-lg">→</span>
              </Link>

              <div className="flex gap-3">
                <Link
                  href={`/patient/dashboard?token=${encodeURIComponent(token)}`}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-98"
                >
                  Patient Dashboard
                </Link>
                <Link
                  href="/appointment"
                  className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-xs sm:text-sm font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-98"
                >
                  Book Another Visit
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        MediBridge AI · Real-Time Digital Token Generation
      </footer>
    </div>
  );
}

export default function TokenScreen() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-xs font-semibold">Loading Token...</p>
        </div>
      }
    >
      <TokenScreenContent />
    </Suspense>
  );
}
