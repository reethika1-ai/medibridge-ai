"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function DoctorLoginPage() {
  const [passkey, setPasskey] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/doctor-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passkey.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Invalid physician passkey.");
      }

      if (res.ok || res.status === 200) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("mb_doctor_auth", "true");
        }
        window.location.href = "/hospital?tab=doctor";
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Physician authentication failed.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950 text-white flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      <Navbar theme="dark" />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        {/* Elevated Glowing Login Card */}
        <div className="relative rounded-[2rem] bg-gradient-to-b from-blue-500/20 via-white/5 to-white/5 p-[1px] shadow-2xl backdrop-blur-xl">
          <div className="rounded-[calc(2rem-1px)] bg-slate-900/90 p-7 sm:p-9 text-slate-100">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-2xl text-white shadow-lg shadow-blue-500/30">
                🩺
              </div>
              <span className="mt-4 inline-block rounded-full bg-blue-500/20 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-blue-300 border border-blue-400/30">
                Physician Credentials Required
              </span>
              <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                Doctor Portal Login
              </h1>
              <p className="mt-1.5 text-xs text-slate-400">
                Enter your clinician passkey to review the prioritized AI triage queue.
              </p>
            </div>

            {errorMsg && (
              <div className="mt-6 rounded-2xl border border-rose-500/40 bg-rose-950/60 p-4 text-xs font-semibold text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="doctor-passkey"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300"
                >
                  Clinical Passkey
                </label>
                <input
                  id="doctor-passkey"
                  type="password"
                  required
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter clinical passkey..."
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3.5 text-sm font-semibold text-white outline-none transition-all duration-200 placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/50"
                />

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 text-xs text-slate-400">
                  <span>Demo Clinician PIN:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPasskey("DOC108")}
                      className="font-mono font-bold text-teal-400 hover:text-teal-300 underline"
                    >
                      DOC108 (Autofill)
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setPasskey("medibridge2026")}
                      className="font-mono font-bold text-blue-400 hover:text-blue-300 underline"
                    >
                      medibridge2026
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-blue-500/40 active:scale-98 disabled:opacity-60"
              >
                {loading ? "Authenticating Clinician..." : "Access Live Triage Board →"}
              </button>
            </form>

            <div className="mt-7 text-center">
              <Link
                href="/"
                className="text-xs font-semibold text-slate-400 transition hover:text-blue-300"
              >
                ← Return to Patient Homepage
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
        MediBridge AI · HIPAA Compliant Clinical Portal
      </footer>
    </div>
  );
}
