"use client";

import { Suspense, useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

type BiomarkerItem = {
  name?: string;
  parameter?: string;
  value: string;
  reference?: string;
  reference_range?: string;
  status: "Normal" | "High" | "Low" | "Critical" | "NORMAL" | "HIGH" | "LOW";
};

type AiSummaryData = {
  chief_complaint: string;
  key_information: string[];
  summary: string;
  urgent_flag: boolean;
  clinical_observations?: string;
  extracted_medications?: Array<{ name: string; dosage?: string; frequency?: string }> | string[];
  diagnostic_findings?: string;
  urgency_level?: string;
  suspected_conditions?: string[];
  recommended_investigations?: string[];
  recommended_medications?: string[];
  biomarkers?: BiomarkerItem[];
  laboratory_biomarkers?: BiomarkerItem[];
  prescription_url?: string | null;
  blood_report_url?: string | null;
  report_url?: string | null;
  document_url?: string | null;
};

function PatientDetailsForm() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";

  const [token, setToken] = useState<string>(initialToken);
  const [symptoms, setSymptoms] = useState<string>("");

  // Triple Document Upload States
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [bloodReportFile, setBloodReportFile] = useState<File | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);

  const [isRxDragging, setIsRxDragging] = useState<boolean>(false);
  const [isBloodDragging, setIsBloodDragging] = useState<boolean>(false);
  const [isReportDragging, setIsReportDragging] = useState<boolean>(false);

  const rxInputRef = useRef<HTMLInputElement>(null);
  const bloodInputRef = useRef<HTMLInputElement>(null);
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

  function handleBloodSelect(selectedFile: File | null) {
    if (!selectedFile) return;
    const err = validateFile(selectedFile);
    if (err) {
      setErrorMsg(`Blood Report: ${err}`);
      return;
    }
    setErrorMsg("");
    setBloodReportFile(selectedFile);
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

  async function uploadFileToCloudinary(file: File, docType: "prescription" | "report" | "blood_report") {
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

      let blood_report_url: string | null = null;
      let blood_report_public_id: string | null = null;
      let blood_report_text = "";

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

      if (bloodReportFile) {
        setLoadingStep("Uploading recent blood report to Cloudinary vault...");
        const bloodUpload = await uploadFileToCloudinary(bloodReportFile, "blood_report");
        blood_report_url = bloodUpload.secure_url;
        blood_report_public_id = bloodUpload.public_id;
        blood_report_text = bloodUpload.extracted_text;
      }

      if (reportFile) {
        setLoadingStep("Uploading medical report/scan to Cloudinary vault...");
        const repUpload = await uploadFileToCloudinary(reportFile, "report");
        report_url = repUpload.secure_url;
        report_public_id = repUpload.public_id;
        report_text = repUpload.extracted_text;
      }

      const document_url = report_url || blood_report_url || prescription_url || null;

      setLoadingStep("Synthesizing deep clinical differential with AI Engine...");
      const triageRes = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: symptoms.trim(),
          source: "APPOINTMENT_OPD",
          is_emergency: false,
          prescription_url,
          blood_report_url,
          report_url,
          document_url,
          prescription_text,
          blood_report_text,
          report_text,
        }),
      });

      const triageData = await triageRes.json();
      if (!triageRes.ok) {
        throw new Error(triageData.error || "Clinical triage analysis failed.");
      }

      const generatedSummary: AiSummaryData = {
        chief_complaint: triageData.primary_presentation || triageData.chief_complaint,
        key_information: triageData.suspected_conditions || triageData.key_information || [],
        summary: triageData.in_depth_narrative || triageData.summary,
        urgent_flag:
          triageData.urgency_level === "URGENT" ||
          triageData.urgency_level === "CRITICAL_RED_ALERT" ||
          triageData.urgency_level === "Urgent" ||
          Boolean(triageData.urgent_flag),
        clinical_observations: triageData.in_depth_narrative || triageData.clinical_observations,
        extracted_medications: triageData.extracted_medications || [],
        diagnostic_findings: triageData.diagnostic_findings,
        urgency_level: triageData.urgency_level,
        suspected_conditions: triageData.suspected_conditions || [],
        recommended_investigations: triageData.recommended_investigations || [],
        recommended_medications: triageData.recommended_medications || [],
        biomarkers: triageData.biomarkers || triageData.laboratory_biomarkers || [],
        prescription_url,
        blood_report_url,
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
          source: "APPOINTMENT_OPD",
          is_emergency: false,
          summary: generatedSummary,
          urgent: generatedSummary.urgent_flag,
          prescription_url,
          blood_report_url,
          report_url,
          document_url,
          report_public_id:
            report_public_id || blood_report_public_id || prescription_public_id || null,
          status: "Waiting",
        }),
      });

      const patchData = await patchRes.json();
      if (!patchRes.ok) {
        throw new Error(patchData.error || "Failed to sync intake record to Supabase.");
      }

      setSuccessMsg("Consultation records, encrypted documents, and AI triage summary saved successfully!");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl sm:p-10">
          <div className="border-b border-slate-100 pb-6">
            <span className="text-xs font-black uppercase tracking-wider text-blue-700">
              Patient Intake & Documentation Portal
            </span>
            <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
              Attach Medical Records & Lab Reports
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Provide your token and describe current symptoms. Attach handwritten prescriptions, recent blood reports (CBC/LFT/KFT), or radiology scans for instant AI differential analysis.
            </p>
          </div>

          {errorMsg && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-bold text-rose-800">
              <span className="text-lg">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-bold text-emerald-800">
              <span className="text-lg">✓</span>
              <span>{successMsg}</span>
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

            {/* TRIPLE GLASSMORPHIC FILE UPLOADS */}
            <div className="border-t border-slate-100 pt-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Attach Medical Files (Prescriptions, Blood Reports & Radiology Scans)
              </label>
              <p className="mt-1 text-xs text-slate-400">
                Files are stored encrypted in the Cloudinary healthcare vault and parsed with Sarvam AI OCR.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
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
                    className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
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
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
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

                {/* 2. Recent Blood Reports */}
                <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-rose-50/20 to-slate-50/40 p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🩸</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Recent Blood Reports</h4>
                        <p className="text-[10px] text-slate-400">CBC, LFT, KFT, Lipids</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200/60">
                      Biomarkers
                    </span>
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsBloodDragging(true);
                    }}
                    onDragLeave={() => setIsBloodDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsBloodDragging(false);
                      handleBloodSelect(e.dataTransfer.files?.[0] || null);
                    }}
                    onClick={() => bloodInputRef.current?.click()}
                    className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
                      isBloodDragging
                        ? "border-rose-500 bg-rose-50/80"
                        : bloodReportFile
                        ? "border-rose-400 bg-rose-50/40"
                        : "border-slate-300 bg-white/70 hover:border-rose-400 hover:bg-rose-50/30"
                    }`}
                  >
                    <input
                      ref={bloodInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                      onChange={(e) => handleBloodSelect(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    {bloodReportFile ? (
                      <div className="space-y-1">
                        <span className="text-xl">✓</span>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                          {bloodReportFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {(bloodReportFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-xl text-slate-400">🩸</span>
                        <p className="text-xs font-bold text-slate-800">Select blood report</p>
                        <p className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</p>
                      </div>
                    )}
                  </div>

                  {bloodReportFile && (
                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-rose-700">✓ Ready</span>
                      <button
                        type="button"
                        onClick={() => setBloodReportFile(null)}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Medical Reports & Scans */}
                <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-indigo-50/20 to-slate-50/40 p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🩻</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Radiology & Scans</h4>
                        <p className="text-[10px] text-slate-400">X-rays, CT, MRI, USG</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60">
                      Imaging
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
                    className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
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
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                          {reportFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {(reportFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-xl text-slate-400">📁</span>
                        <p className="text-xs font-bold text-slate-800">Select scan / report</p>
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
                    <span>{loadingStep || "Processing with AI Clinical Engine..."}</span>
                  </span>
                ) : (
                  "Generate AI Triage & Sync with Supabase →"
                )}
              </button>
            </div>
          </form>

          {/* AI Clinical Summary Display with Visual Blocks & Biomarkers */}
          {aiSummary && (
            <div className="mt-10 rounded-3xl border border-blue-200 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/30 p-7 shadow-lg shadow-blue-500/5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white shadow-xs">
                    🩺
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      MediBridge Clinical Differential Assessment
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Evidence-based clinical intelligence and biomarker extraction
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
                    Primary Clinical Presentation
                  </span>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {aiSummary.chief_complaint}
                  </p>
                </div>

                {aiSummary.clinical_observations && (
                  <div className="rounded-2xl bg-white p-4 border border-blue-100 shadow-xs">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                      Pathophysiological Narrative
                    </span>
                    <p className="mt-1 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {aiSummary.clinical_observations}
                    </p>
                  </div>
                )}

                {/* Suspected Conditions */}
                {aiSummary.suspected_conditions && aiSummary.suspected_conditions.length > 0 && (
                  <div className="rounded-2xl bg-white p-4 border border-blue-100 shadow-xs">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                      Differential Diagnoses (Ranked by Suspicion)
                    </span>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {aiSummary.suspected_conditions.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-bold text-blue-900"
                        >
                          {idx + 1}. {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Investigations */}
                {aiSummary.recommended_investigations && aiSummary.recommended_investigations.length > 0 && (
                  <div className="rounded-2xl bg-white p-4 border border-indigo-100 shadow-xs">
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
                      Recommended Confirmatory Investigations
                    </span>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {aiSummary.recommended_investigations.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-900"
                        >
                          🧪 {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Laboratory Biomarkers Table */}
                {((aiSummary.biomarkers && aiSummary.biomarkers.length > 0) ||
                  (aiSummary.laboratory_biomarkers && aiSummary.laboratory_biomarkers.length > 0)) && (
                  <div className="rounded-2xl bg-white p-4 border border-rose-100 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                        <span>🩸</span>
                        <span>Extracted Laboratory Biomarkers</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        From Blood Report
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {(aiSummary.biomarkers || aiSummary.laboratory_biomarkers || []).map((bio, idx) => {
                        const name = bio.name || bio.parameter || "Biomarker";
                        const ref = bio.reference || bio.reference_range || "Standard";
                        const isCritical = String(bio.status).toLowerCase().includes("crit");
                        const isHigh = String(bio.status).toLowerCase().includes("high");
                        const isLow = String(bio.status).toLowerCase().includes("low");

                        return (
                          <div
                            key={idx}
                            className={`rounded-xl p-3 border text-xs ${
                              isCritical
                                ? "bg-rose-50 border-rose-300"
                                : isHigh
                                ? "bg-amber-50 border-amber-300"
                                : isLow
                                ? "bg-blue-50 border-blue-300"
                                : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{name}</span>
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                                  isCritical
                                    ? "bg-rose-600 text-white animate-pulse"
                                    : isHigh
                                    ? "bg-amber-500 text-white"
                                    : isLow
                                    ? "bg-blue-500 text-white"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                {isCritical
                                  ? "🚨 CRITICAL"
                                  : isHigh
                                  ? "▲ HIGH"
                                  : isLow
                                  ? "▼ LOW"
                                  : "NORMAL"}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
                              <span>Value: <strong className="text-slate-900">{bio.value}</strong></span>
                              <span className="text-[10px] text-slate-400">Ref: {ref}</span>
                            </div>
                          </div>
                        );
                      })}
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
        MediBridge AI · Real-Time Clinical Intake with AI Diagnostic Reasoning & Sarvam OCR
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
