"use client";

import { Suspense, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

type AiSummaryData = {
  chief_complaint: string;
  key_information: string[];
  summary: string;
  urgent_flag: boolean;
};

function PatientDetailsForm() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";

  const [token, setToken] = useState<string>(initialToken);
  const [symptoms, setSymptoms] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const [uploadResult, setUploadResult] = useState<{
    public_id: string;
    secure_url: string;
  } | null>(null);

  const [aiSummary, setAiSummary] = useState<AiSummaryData | null>(null);

  function handleFileSelect(selectedFile: File | null) {
    if (!selectedFile) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(selectedFile.type)) {
      setErrorMsg("Unsupported file format. Please upload a PDF, JPG, or PNG report.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMsg("File exceeds 10MB limit. Please select a smaller document.");
      return;
    }
    setErrorMsg("");
    setFile(selectedFile);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0] || null;
    handleFileSelect(droppedFile);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setAiSummary(null);

    if (!token.trim()) {
      setErrorMsg("Please provide your appointment token (e.g. MB-743721).");
      return;
    }
    if (!symptoms.trim()) {
      setErrorMsg("Please describe your symptoms or reason for visit.");
      return;
    }

    setLoading(true);
    let uploadedPublicId = uploadResult?.public_id || null;
    let uploadedSecureUrl = uploadResult?.secure_url || null;

    try {
      if (file && !uploadResult) {
        setLoadingStep("Uploading document to Cloudinary vault...");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("token", token.trim());

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Document upload to Cloudinary failed.");
        }

        uploadedPublicId = uploadData.public_id;
        uploadedSecureUrl = uploadData.secure_url;
        setUploadResult({ public_id: uploadData.public_id, secure_url: uploadData.secure_url });
      }

      setLoadingStep("Synthesizing clinical intake with xAI Grok...");
      const summaryRes = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: symptoms.trim(),
          report_metadata: file ? file.name : null,
        }),
      });

      const summaryData = await summaryRes.json();
      if (!summaryRes.ok) {
        throw new Error(summaryData.error || "Grok summary generation failed.");
      }

      const generatedSummary: AiSummaryData = {
        chief_complaint: summaryData.chief_complaint,
        key_information: summaryData.key_information || [],
        summary: summaryData.summary,
        urgent_flag: Boolean(summaryData.urgent_flag),
      };
      setAiSummary(generatedSummary);

      setLoadingStep("Syncing consultation records to Supabase...");
      const patchRes = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          symptoms: symptoms.trim(),
          summary: generatedSummary,
          urgent: generatedSummary.urgent_flag,
          report_public_id: uploadedPublicId,
          status: "Waiting",
        }),
      });

      const patchData = await patchRes.json();
      if (!patchRes.ok) {
        throw new Error(patchData.error || "Failed to sync intake record to Supabase.");
      }

      setSuccessMsg("Consultation records, Cloudinary document, and Grok AI summary saved successfully!");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-blue-50/30 to-indigo-50/20 text-slate-900 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/patient/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 transition hover:text-blue-800"
        >
          ← Return to Patient Dashboard
        </Link>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xl shadow-blue-500/5 sm:p-10">
          <div className="border-b border-slate-100 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-700 border border-blue-200/60">
                Step 2 of Consultation
              </span>
              {token && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-bold text-slate-700">
                  Token: {token}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Document Vault & AI Intake
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Upload existing medical reports to our Cloudinary vault and describe your symptoms for real-time xAI Grok clinical summarization.
            </p>
          </div>

          {errorMsg && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
              ✓ {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Token Input */}
            <div>
              <label htmlFor="token-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Appointment Token <span className="text-rose-500">*</span>
              </label>
              <input
                id="token-input"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="e.g. MB-743721"
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3.5 text-sm font-mono font-bold text-slate-900 outline-none transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Symptoms Input */}
            <div>
              <label htmlFor="symptoms-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Describe Your Symptoms or Medical Concern <span className="text-rose-500">*</span>
              </label>
              <p className="mt-1 text-xs text-slate-400">
                Mention duration, severity, progression, and any relevant medical history.
              </p>
              <textarea
                id="symptoms-input"
                rows={5}
                required
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g. Experiencing sharp chest tightness for 2 days radiating to left shoulder, accompanied by shortness of breath upon climbing stairs..."
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50/50 p-4 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </div>

            {/* Interactive Drag-and-Drop Dropzone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Upload Medical Report / Scan (PDF, JPG, PNG)
              </label>
              <p className="mt-1 text-xs text-slate-400">
                Uploaded files are stored encrypted in the Cloudinary healthcare vault.
              </p>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`mt-2.5 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/70 scale-[1.01]"
                    : "border-slate-300 bg-slate-50/60 hover:border-blue-500 hover:bg-blue-50/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  className="hidden"
                />

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm border border-slate-200/80">
                  📁
                </div>
                <p className="mt-3 text-sm font-bold text-slate-800">
                  {file ? file.name : "Click to select or drag & drop reports"}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {file
                    ? `File size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`
                    : "PDF, JPG, PNG or WEBP up to 10MB"}
                </p>
              </div>

              {uploadResult && (
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-blue-50 p-3.5 text-xs text-blue-900 border border-blue-200/60">
                  <span className="font-mono">Vault ID: {uploadResult.public_id}</span>
                  <a
                    href={uploadResult.secure_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline hover:text-blue-700"
                  >
                    View in Cloudinary ↗
                  </a>
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="border-t border-slate-100 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-4 text-base font-extrabold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-blue-500/35 active:scale-98 disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{loadingStep || "Processing with xAI Grok..."}</span>
                  </span>
                ) : (
                  "Generate AI Summary & Sync with Supabase →"
                )}
              </button>
            </div>
          </form>

          {/* AI Clinical Summary Display with Visual Blocks & Pills */}
          {aiSummary && (
            <div className="mt-10 rounded-3xl border border-blue-200 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/30 p-7 shadow-lg shadow-blue-500/5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-xs">
                    🤖
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      xAI Grok Intake Assessment
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Automated clinical triage synthesis
                    </p>
                  </div>
                </div>

                {/* Urgency Pill Indicator */}
                {aiSummary.urgent_flag ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3.5 py-1 text-xs font-black text-rose-700 border border-rose-200 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-rose-600" />
                    ⚠️ High Urgency Detected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    Routine Priority
                  </span>
                )}
              </div>

              {aiSummary.urgent_flag && (
                <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50/90 p-4 text-xs font-medium text-rose-900 leading-relaxed">
                  <strong className="font-extrabold">Emergency Safety Notice:</strong> The symptoms described may warrant immediate clinical intervention. If you are experiencing chest pain, severe shortness of breath, loss of consciousness, or signs of stroke, proceed immediately to the nearest emergency room.
                </div>
              )}

              <div className="mt-6 space-y-4 text-sm">
                <div className="rounded-2xl bg-white p-4 border border-blue-100 shadow-xs">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                    Chief Complaint
                  </span>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {aiSummary.chief_complaint}
                  </p>
                </div>

                {aiSummary.key_information.length > 0 && (
                  <div className="rounded-2xl bg-white p-4 border border-blue-100 shadow-xs">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                      Key Clinical Observations
                    </span>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {aiSummary.key_information.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-xl border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"
                        >
                          • {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl bg-white p-4 border border-blue-100 shadow-xs">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                    Physician Briefing Narrative
                  </span>
                  <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">
                    {aiSummary.summary}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 border-t border-blue-200/60 pt-5">
                <Link
                  href={`/patient/dashboard?token=${encodeURIComponent(token)}`}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95"
                >
                  View on Patient Dashboard →
                </Link>
                <Link
                  href="/doctor"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95"
                >
                  View Doctor Queue
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        MediBridge AI · Real-Time Clinical Intake with xAI Grok
      </footer>
    </div>
  );
}

export default function PatientDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-xs font-semibold">Loading Patient Intake Details...</p>
        </div>
      }
    >
      <PatientDetailsForm />
    </Suspense>
  );
}