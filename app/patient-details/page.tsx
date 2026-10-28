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
  clinical_observations?: string;
  extracted_medications?: Array<{ name: string; dosage?: string; frequency?: string }> | string[];
  diagnostic_findings?: string;
  urgency_level?: string;
  prescription_url?: string | null;
  report_url?: string | null;
  document_url?: string | null;
};

function PatientDetailsForm() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";

  const [token, setToken] = useState<string>(initialToken);
  const [symptoms, setSymptoms] = useState<string>("");

  // Dual File Upload States
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [isRxDragging, setIsRxDragging] = useState<boolean>(false);
  const [isReportDragging, setIsReportDragging] = useState<boolean>(false);

  const rxInputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const [aiSummary, setAiSummary] = useState<AiSummaryData | null>(null);

  function validateFile(file: File): string | null {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type)) {
      return "Unsupported file format. Please upload a PDF, JPG, or PNG document.";
    }
    if (file.size > 10 * 1024 * 1024) {
      return "File exceeds 10MB limit. Please select a smaller document.";
    }
    return null;
  }

  function handleRxSelect(selectedFile: File | null) {
    if (!selectedFile) return;
    const err = validateFile(selectedFile);
    if (err) {
      setErrorMsg(`Prescription: ${err}`);
      return;
    }
    setErrorMsg("");
    setPrescriptionFile(selectedFile);
  }

  function handleReportSelect(selectedFile: File | null) {
    if (!selectedFile) return;
    const err = validateFile(selectedFile);
    if (err) {
      setErrorMsg(`Medical Report: ${err}`);
      return;
    }
    setErrorMsg("");
    setReportFile(selectedFile);
  }

  async function uploadFileToCloudinary(file: File, docType: "prescription" | "report") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("token", token.trim());
    formData.append("doc_type", docType);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Failed to upload ${docType} to Cloudinary.`);
    }

    return {
      secure_url: data.secure_url || data.url,
      public_id: data.public_id,
      extracted_text: data.extracted_text || "",
    };
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

    try {
      let prescription_url: string | null = null;
      let prescription_public_id: string | null = null;
      let prescription_text = "";

      let report_url: string | null = null;
      let report_public_id: string | null = null;
      let report_text = "";

      if (prescriptionFile) {
        setLoadingStep("Uploading previous prescription to Cloudinary vault...");
        const rxUpload = await uploadFileToCloudinary(prescriptionFile, "prescription");
        prescription_url = rxUpload.secure_url;
        prescription_public_id = rxUpload.public_id;
        prescription_text = rxUpload.extracted_text;
      }

      if (reportFile) {
        setLoadingStep("Uploading medical report/scan to Cloudinary vault...");
        const repUpload = await uploadFileToCloudinary(reportFile, "report");
        report_url = repUpload.secure_url;
        report_public_id = repUpload.public_id;
        report_text = repUpload.extracted_text;
      }

      const document_url = report_url || prescription_url || null;

      setLoadingStep("Synthesizing deep clinical intake with xAI Grok...");
      const triageRes = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: symptoms.trim(),
          prescription_url,
          report_url,
          document_url,
          prescription_text,
          report_text,
        }),
      });

      const triageData = await triageRes.json();
      if (!triageRes.ok) {
        throw new Error(triageData.error || "Grok triage analysis failed.");
      }

      const generatedSummary: AiSummaryData = {
        chief_complaint: triageData.chief_complaint,
        key_information: triageData.key_information || [],
        summary: triageData.summary,
        urgent_flag: triageData.urgency_level === "Urgent" || Boolean(triageData.urgent_flag),
        clinical_observations: triageData.clinical_observations,
        extracted_medications: triageData.extracted_medications || [],
        diagnostic_findings: triageData.diagnostic_findings,
        urgency_level: triageData.urgency_level,
        prescription_url,
        report_url,
        document_url,
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
          prescription_url,
          report_url,
          document_url,
          report_public_id: report_public_id || prescription_public_id || null,
          status: "Waiting",
        }),
      });

      const patchData = await patchRes.json();
      if (!patchRes.ok) {
        throw new Error(patchData.error || "Failed to sync intake record to Supabase.");
      }

      setSuccessMsg("Consultation records, dual Cloudinary documents, and Grok AI summary saved successfully!");
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

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
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
              Document Vault & Deep AI Intake
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Upload past prescriptions and lab reports/scans to the Cloudinary vault for Sarvam AI OCR digitization and xAI Grok clinical triage.
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
                rows={4}
                required
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g. Experiencing sharp chest tightness for 2 days radiating to left shoulder, accompanied by shortness of breath..."
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50/50 p-4 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </div>

            {/* DUAL GLASSMORPHIC FILE UPLOADS */}
            <div className="border-t border-slate-100 pt-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Attach Medical Files (Prescriptions & Lab Reports / Scans)
              </label>
              <p className="mt-1 text-xs text-slate-400">
                Files are stored encrypted in the Cloudinary healthcare vault and parsed with Sarvam AI OCR.
              </p>

              <div className="mt-4 grid gap-6 md:grid-cols-2">
                {/* 1. Previous Prescriptions */}
                <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-blue-50/20 to-slate-50/40 p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📄</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Previous Prescriptions</h4>
                        <p className="text-[10px] text-slate-400">Handwritten Rx notes</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
                      Sarvam OCR
                    </span>
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsRxDragging(true);
                    }}
                    onDragLeave={() => setIsRxDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsRxDragging(false);
                      handleRxSelect(e.dataTransfer.files?.[0] || null);
                    }}
                    onClick={() => rxInputRef.current?.click()}
                    className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                      isRxDragging
                        ? "border-blue-500 bg-blue-50/80"
                        : prescriptionFile
                        ? "border-blue-400 bg-blue-50/40"
                        : "border-slate-300 bg-white/70 hover:border-blue-400 hover:bg-blue-50/30"
                    }`}
                  >
                    <input
                      ref={rxInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                      onChange={(e) => handleRxSelect(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    {prescriptionFile ? (
                      <div className="space-y-1">
                        <span className="text-xl">✓</span>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                          {prescriptionFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {(prescriptionFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-xl text-slate-400">📤</span>
                        <p className="text-xs font-bold text-slate-800">Select prescription</p>
                        <p className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</p>
                      </div>
                    )}
                  </div>

                  {prescriptionFile && (
                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-emerald-700">✓ Ready</span>
                      <button
                        type="button"
                        onClick={() => setPrescriptionFile(null)}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Medical Reports & Scans */}
                <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-indigo-50/20 to-slate-50/40 p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🩻</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Medical Reports & Scans</h4>
                        <p className="text-[10px] text-slate-400">Lab panels, X-rays, MRI</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60">
                      Imaging / Lab
                    </span>
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsReportDragging(true);
                    }}
                    onDragLeave={() => setIsReportDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsReportDragging(false);
                      handleReportSelect(e.dataTransfer.files?.[0] || null);
                    }}
                    onClick={() => reportInputRef.current?.click()}
                    className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                      isReportDragging
                        ? "border-indigo-500 bg-indigo-50/80"
                        : reportFile
                        ? "border-indigo-400 bg-indigo-50/40"
                        : "border-slate-300 bg-white/70 hover:border-indigo-400 hover:bg-indigo-50/30"
                    }`}
                  >
                    <input
                      ref={reportInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                      onChange={(e) => handleReportSelect(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    {reportFile ? (
                      <div className="space-y-1">
                        <span className="text-xl">✓</span>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                          {reportFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {(reportFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-xl text-slate-400">📁</span>
                        <p className="text-xs font-bold text-slate-800">Select lab / scan file</p>
                        <p className="text-[10px] text-slate-400">PDF, JPG, PNG, DICOM</p>
                      </div>
                    )}
                  </div>

                  {reportFile && (
                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-indigo-700">✓ Ready</span>
                      <button
                        type="button"
                        onClick={() => setReportFile(null)}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
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
                  "Generate AI Triage & Sync with Supabase →"
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
                      xAI Grok Deep Clinical Assessment
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Automated multi-modal clinical triage synthesis
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
                  <strong className="font-extrabold">Emergency Safety Notice:</strong> The symptoms described may warrant immediate clinical intervention. If experiencing chest pain, acute dyspnea, or neuro symptoms, proceed immediately to an emergency care department.
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

                {aiSummary.clinical_observations && (
                  <div className="rounded-2xl bg-white p-4 border border-blue-100 shadow-xs">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                      Deep Clinical Observations
                    </span>
                    <p className="mt-1 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {aiSummary.clinical_observations}
                    </p>
                  </div>
                )}

                {aiSummary.diagnostic_findings && (
                  <div className="rounded-2xl bg-white p-4 border border-blue-100 shadow-xs">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                      Diagnostic Findings & Imaging
                    </span>
                    <p className="mt-1 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {aiSummary.diagnostic_findings}
                    </p>
                  </div>
                )}

                {aiSummary.key_information.length > 0 && (
                  <div className="rounded-2xl bg-white p-4 border border-blue-100 shadow-xs">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                      Key Clinical Indicators
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
        MediBridge AI · Real-Time Clinical Intake with xAI Grok & Sarvam OCR
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
