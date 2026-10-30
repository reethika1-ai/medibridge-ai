"use client";

import React, { useState, useEffect } from "react";

interface OtpAuthModalProps {
  isOpen: boolean;
  onSuccess: (userData: { name: string; phone: string }) => void;
  onClose: () => void;
  initialName?: string;
  initialPhone?: string;
}

export default function OtpAuthModal({
  isOpen,
  onSuccess,
  onClose,
  initialName = "",
  initialPhone = "",
}: OtpAuthModalProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState("");
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (initialName) setName(initialName);
    if (initialPhone) setPhone(initialPhone);
  }, [initialName, initialPhone]);

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setError("");
      setOtp("");
      setDebugOtp(null);
      if (!phone) {
        setStep("phone");
      }
    }
  }, [isOpen]);

  // Countdown timer for resend (60s)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  if (!isOpen) return null;

  async function handleSendCode(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile phone number.");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone.slice(-10) }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send verification code. Please retry.");
      }

      if (data.debug_otp) {
        setDebugOtp(data.debug_otp);
      } else {
        setDebugOtp(null);
      }

      setStep("otp");
      setTimer(60);
      setOtp("");
    } catch (err: any) {
      setError(err?.message || "Could not dispatch OTP. Please check your network connection.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerifyOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError("Please enter the complete 6-digit confirmation code.");
      return;
    }

    setIsVerifying(true);
    try {
      const cleanPhone = phone.replace(/\D/g, "").slice(-10);
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          otp: cleanOtp,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid or expired OTP. Please check and try again.");
      }

      const formattedPhone = cleanPhone.startsWith("+91") ? cleanPhone : `+91 ${cleanPhone}`;
      onSuccess({
        name: name.trim(),
        phone: formattedPhone,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  const cleanDisplayPhone = phone.replace(/\D/g, "").slice(-10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2.2rem] border border-slate-100 bg-white p-7 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition"
        >
          ✕
        </button>

        {/* Modal Brand Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00A896]/10 text-2xl text-[#00A896]">
            📱
          </div>
          <div>
            <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#00A896] border border-teal-100">
              Security Auth
            </span>
            <h2 className="text-lg font-black text-slate-900">
              {step === "phone" ? "Patient Mobile Verification" : "Enter Verification Code"}
            </h2>
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          {step === "phone"
            ? "To prevent queue spamming and receive real-time SMS consultation updates, verify your mobile number."
            : `We have dispatched a 6-digit confirmation code to +91 ${cleanDisplayPhone || phone}.`}
        </p>

        {/* Error Notice */}
        {error && (
          <div className="mt-3.5 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 animate-fadeIn">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Name and Phone Input */}
        {step === "phone" ? (
          <form onSubmit={handleSendCode} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Patient Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                10-Digit Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative mt-1.5 flex rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
                <span className="flex items-center px-3.5 text-xs font-bold text-slate-500 border-r border-slate-200 bg-slate-100/60">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="9876543210"
                  className="w-full bg-transparent px-4 py-3 text-sm font-mono font-bold text-slate-900 outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSending}
                className="w-full rounded-full bg-gradient-to-r from-[#00A896] via-[#028090] to-[#02C39A] py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-teal-600/25 transition active:scale-95 hover:opacity-95 disabled:opacity-60"
              >
                {isSending ? "Sending OTP..." : "Send Verification Code →"}
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Clean 6-Digit OTP Input & Verification (No Demo Mode) */
          <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Enter 6-Digit OTP <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="------"
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-center font-mono text-2xl font-black tracking-[0.5em] text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
              />
              {debugOtp && (
                <div className="mt-2.5 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setOtp(debugOtp)}
                    className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/90 px-3 py-1.5 text-[11px] font-bold text-teal-800 shadow-sm transition hover:bg-teal-100"
                  >
                    <span>ℹ️ Code: <strong className="font-mono tracking-wider">{debugOtp}</strong></span>
                    <span className="rounded-md bg-teal-600 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">Tap to autofill</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setError("");
                }}
                className="font-bold text-slate-600 hover:text-slate-900 hover:underline"
              >
                ← Edit Mobile Number
              </button>
              <span>
                {timer > 0 ? (
                  `Resend in ${timer}s`
                ) : (
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => handleSendCode()}
                    className="font-bold text-[#00A896] hover:underline disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                )}
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isVerifying || otp.trim().length !== 6}
                className="w-full rounded-full bg-gradient-to-r from-[#00A896] via-[#028090] to-[#02C39A] py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-teal-600/25 transition active:scale-95 hover:opacity-95 disabled:opacity-60"
              >
                {isVerifying ? "Verifying Token..." : "VERIFY & UNLOCK CONSULTATION →"}
              </button>
            </div>
          </form>
        )}

        {/* SOS Reminder Notice */}
        <div className="mt-4 border-t border-slate-100 pt-3 text-center">
          <p className="text-[11px] text-slate-400">
            Experiencing severe trauma or emergency? Emergency SOS requires <strong>zero OTP</strong> and is accessible 24/7.
          </p>
        </div>
      </div>
    </div>
  );
}
