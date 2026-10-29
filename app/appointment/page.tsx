"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/context/LanguageContext";

const departmentDoctors: Record<string, string[]> = {
  Cardiology: [
    "Dr. Sarah Vance, MD (Cardiologist)",
    "Dr. Marcus Cole, MD (Interventional)",
  ],
  Dermatology: [
    "Dr. Maya Patel, MD (Clinical Dermatology)",
    "Dr. Eric Zhang, MD (Aesthetic)",
  ],
  "General Medicine": [
    "Dr. Alan Reed, MD (Internal Medicine)",
    "Dr. Elena Gomez, MD (General Physician)",
  ],
  Neurology: [
    "Dr. James Wilson, MD (Neurologist)",
    "Dr. Rachel Kim, MD (Neurophysiology)",
  ],
  Orthopedics: [
    "Dr. David Miller, MD (Orthopedic Surgeon)",
    "Dr. Ananya Roy, MD (Sports Medicine)",
  ],
  Pediatrics: [
    "Dr. Lisa Chen, MD (Pediatric Specialist)",
    "Dr. Thomas Clark, MD (Child Care)",
  ],
};

const timeSlots = [
  "09:00 AM",
  "10:00 AM",
  "11:30 AM",
  "02:00 PM",
  "03:30 PM",
  "04:30 PM",
];

const genderOptions = [
  "Female",
  "Male",
  "Non-Binary",
  "Other",
  "Prefer not to say",
];

export default function AppointmentPage() {
  const router = useRouter();
  const { language, t } = useLanguage();

  // Voice Input States
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const recognitionRef = useRef<any>(null);
  const baseSymptomsRef = useRef<string>("");

  // Patient Demographic Fields
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Female");
  const [phone, setPhone] = useState("");
  const [symptoms, setSymptoms] = useState("");

  function toggleVoiceInput() {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn("Could not stop recognition:", e);
        }
      }
      setIsListening(false);
      return;
    }

    setSpeechError("");

    const SpeechRecognition =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition)) ||
      null;

    if (!SpeechRecognition) {
      setSpeechError(t("voice_error"));
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;

      // Regional accent calibration based on active locale
      if (language === "hi") {
        recognition.lang = "hi-IN";
      } else if (language === "te") {
        recognition.lang = "te-IN";
      } else {
        recognition.lang = "en-IN";
      }

      baseSymptomsRef.current = symptoms;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const base = baseSymptomsRef.current.trim();
        const spoken = (finalTranscript + interimTranscript).trim();
        const sep = base && spoken ? " " : "";
        setSymptoms(base + sep + spoken);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          setSpeechError(t("voice_error"));
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
      setSpeechError(t("voice_error"));
      setIsListening(false);
    }
  }

  // Scheduling Fields
  const [department, setDepartment] = useState("General Medicine");
  const [doctor, setDoctor] = useState(departmentDoctors["General Medicine"][0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState(timeSlots[0]);

  // Dual File Upload States
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [isPrescriptionDragging, setIsPrescriptionDragging] = useState(false);
  const [isReportDragging, setIsReportDragging] = useState(false);

  const prescriptionInputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);

  // Submission States
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function handleDepartmentChange(selectedDept: string) {
    setDepartment(selectedDept);
    const docs = departmentDoctors[selectedDept] || [];
    setDoctor(docs[0] || "Attending Physician");
  }

  function validateFile(file: File): string | null {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];
    if (!allowed.includes(file.type)) {
      return "Unsupported format. Please upload a PDF, JPG, or PNG document.";
    }
    if (file.size > 10 * 1024 * 1024) {
      return "File exceeds 10MB limit. Please upload a smaller document.";
    }
    return null;
  }

  function handlePrescriptionSelect(file: File | null) {
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setErrorMsg(`Prescription: ${err}`);
      return;
    }
    setErrorMsg("");
    setPrescriptionFile(file);
  }

  function handleReportSelect(file: File | null) {
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setErrorMsg(`Medical Report: ${err}`);
      return;
    }
    setErrorMsg("");
    setReportFile(file);
  }

  async function uploadToCloudinary(
    file: File,
    token: string,
    docType: "prescription" | "report"
  ): Promise<{ secure_url: string; public_id: string; extracted_text: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("token", token);
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

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Please enter the patient's full name.");
      return;
    }
    if (!age || Number(age) <= 0) {
      setErrorMsg("Please enter a valid age.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("Please enter a valid phone number.");
      return;
    }
    if (!date) {
      setErrorMsg("Please select an appointment date.");
      return;
    }
    if (!symptoms.trim()) {
      setErrorMsg("Please describe patient symptoms or reason for consultation.");
      return;
    }

    setLoading(true);

    try {
      const randNum = Math.floor(100000 + Math.random() * 900000);
      const token = `MB-${randNum}`;

      let prescription_url: string | null = null;
      let prescription_public_id: string | null = null;
      let prescription_text = "";

      let report_url: string | null = null;
      let report_public_id: string | null = null;
      let report_text = "";

      // 1. Upload Previous Prescriptions if provided
      if (prescriptionFile) {
        setLoadingStep("Uploading previous prescription to Cloudinary vault...");
        const rxUpload = await uploadToCloudinary(prescriptionFile, token, "prescription");
        prescription_url = rxUpload.secure_url;
        prescription_public_id = rxUpload.public_id;
        prescription_text = rxUpload.extracted_text;
      }

      // 2. Upload Medical Reports & Scans if provided
      if (reportFile) {
        setLoadingStep("Uploading medical reports & imaging to Cloudinary vault...");
        const reportUpload = await uploadToCloudinary(reportFile, token, "report");
        report_url = reportUpload.secure_url;
        report_public_id = reportUpload.public_id;
        report_text = reportUpload.extracted_text;
      }

      // Backward compatibility mapping for single document_url
      const document_url = report_url || prescription_url || null;

      // 3. Deep Clinical Analysis via xAI Grok & Sarvam OCR Agent
      setLoadingStep("Synthesizing deep clinical assessment with xAI Grok...");
      let triageData: any = null;
      try {
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
            patient_info: {
              name: name.trim(),
              age: Number(age),
              gender,
              phone: phone.trim(),
              department,
            },
          }),
        });

        if (triageRes.ok) {
          triageData = await triageRes.json();
        }
      } catch (err) {
        console.warn("Triage API error, using safe fallback:", err);
      }

      // 4. Register Appointment in Supabase
      setLoadingStep("Registering appointment & issuing token in Supabase...");
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          patient_name: name.trim(),
          age: Number(age),
          gender,
          phone: phone.trim(),
          department: `${department} - ${doctor.split(",")[0]}`,
          appointment_date: `${date} @ ${time}`,
          symptoms: symptoms.trim(),
          urgent: triageData?.urgency_level === "Urgent" || Boolean(triageData?.urgent_flag),
          prescription_url,
          report_url,
          document_url,
          report_public_id: report_public_id || prescription_public_id || null,
          summary: triageData || {
            chief_complaint: symptoms.slice(0, 80),
            summary: symptoms,
            clinical_observations: symptoms,
            urgency_level: "Normal",
            status: "Waiting",
          },
          status: "Waiting",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to book appointment in database.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("medibridge_last_token", token);
      }

      router.push(
        `/appointment/token?token=${encodeURIComponent(token)}&name=${encodeURIComponent(
          name.trim()
        )}&dept=${encodeURIComponent(department)}&doctor=${encodeURIComponent(
          doctor
        )}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Booking request failed.");
      setLoading(false);
      setLoadingStep("");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-blue-50/30 to-indigo-50/20 text-slate-900 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 transition hover:text-blue-800"
        >
          ← Return to Overview
        </Link>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-7 shadow-xl shadow-blue-500/5 sm:p-10 backdrop-blur-sm">
          <div className="border-b border-slate-100 pb-6">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-700 border border-blue-200/60">
                Step 1 of Consultation
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Comprehensive Digital Intake
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              {t("form_title")}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
              {t("form_desc")}
            </p>
          </div>

          {errorMsg && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleBook} className="mt-8 space-y-6">
            {/* Patient Demographics: Name, Age, Gender, Phone */}
            <div className="grid gap-6 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <label
                  htmlFor="patient-name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  {t("patient_name")} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="patient-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("patient_name_placeholder")}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="patient-age"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  {t("age")} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="patient-age"
                  type="number"
                  min="1"
                  max="125"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 34"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="patient-gender"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  {t("gender")} <span className="text-rose-500">*</span>
                </label>
                <select
                  id="patient-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  {genderOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Contact Phone & Symptoms */}
            <div className="grid gap-6 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <label
                  htmlFor="patient-phone"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  {t("phone")} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="patient-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("phone_placeholder")}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-7">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="patient-symptoms"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    {t("symptoms")} <span className="text-rose-500">*</span>
                  </label>

                  <div className="flex items-center gap-2">
                    {isListening && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600 animate-pulse">
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                        <span>{t("micListening")}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                        isListening
                          ? "bg-rose-500 text-white ring-4 ring-rose-500/30 animate-pulse shadow-md"
                          : "bg-blue-50 text-blue-700 border border-blue-200/60 hover:bg-blue-100"
                      }`}
                      title={t("voice_help")}
                    >
                      <span>{isListening ? "⏹️" : "🎙️"}</span>
                      <span>{isListening ? t("micListening") : t("micIdle")}</span>
                    </button>
                  </div>
                </div>

                <textarea
                  id="patient-symptoms"
                  rows={2}
                  required
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder={t("symptoms_placeholder")}
                  className={`mt-2 w-full rounded-2xl border bg-slate-50/50 p-3.5 text-sm font-medium text-slate-900 outline-none transition-all duration-200 leading-relaxed ${
                    isListening
                      ? "border-rose-400 ring-2 ring-rose-400/40 bg-rose-50/20"
                      : "border-slate-300 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500"
                  }`}
                />
                {speechError && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600">{speechError}</p>
                )}
              </div>
            </div>

            {/* Department and Doctor Selection Grid */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="dept-select"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  {t("specialty")} <span className="text-rose-500">*</span>
                </label>
                <select
                  id="dept-select"
                  value={department}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  {Object.keys(departmentDoctors).map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="doc-select"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  {t("physician")} <span className="text-rose-500">*</span>
                </label>
                <select
                  id="doc-select"
                  value={doctor}
                  onChange={(e) => setDoctor(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  {(departmentDoctors[department] || []).map((doc) => (
                    <option key={doc} value={doc}>
                      {doc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date and Time Slot Grid */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="apt-date"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  {t("appointment_date")} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="apt-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="apt-time"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  {t("appointment_time")} <span className="text-rose-500">*</span>
                </label>
                <select
                  id="apt-time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  {timeSlots.map((ts) => (
                    <option key={ts} value={ts}>
                      {ts}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DUAL GLASSMORPHIC FILE UPLOADS */}
            <div className="border-t border-slate-100 pt-6">
              <div className="mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-blue-700">
                  {t("doc_vault_title")}
                </span>
                <h3 className="mt-1 text-base font-bold text-slate-900">
                  {t("doc_vault_subtitle")}
                </h3>
                <p className="text-xs text-slate-500">
                  {t("doc_vault_desc")}
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* 1. Previous Prescriptions Box */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-blue-50/20 to-slate-50/40 p-5 shadow-xs backdrop-blur-sm transition-all duration-200 hover:border-blue-400 hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-xl text-blue-700 shadow-inner">
                          📄
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            {t("rx_title")}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {t("rx_subtitle")}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
                        Sarvam OCR
                      </span>
                    </div>

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsPrescriptionDragging(true);
                      }}
                      onDragLeave={() => setIsPrescriptionDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsPrescriptionDragging(false);
                        handlePrescriptionSelect(e.dataTransfer.files?.[0] || null);
                      }}
                      onClick={() => prescriptionInputRef.current?.click()}
                      className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                        isPrescriptionDragging
                          ? "border-blue-500 bg-blue-50/80 scale-[1.01]"
                          : prescriptionFile
                          ? "border-blue-400 bg-blue-50/40"
                          : "border-slate-300 bg-white/70 hover:border-blue-400 hover:bg-blue-50/30"
                      }`}
                    >
                      <input
                        ref={prescriptionInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                        onChange={(e) =>
                          handlePrescriptionSelect(e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />

                      {prescriptionFile ? (
                        <div className="space-y-1">
                          <span className="text-2xl">✓</span>
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[220px]">
                            {prescriptionFile.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(prescriptionFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for Upload
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-2xl text-slate-400">📤</span>
                          <p className="text-xs font-bold text-slate-800">
                            Click or drag prescription
                          </p>
                          <p className="text-[10px] text-slate-400">
                            PDF, JPG, PNG up to 10MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {prescriptionFile && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Attached: Rx File
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrescriptionFile(null);
                        }}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Medical Reports & Scans Box */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-indigo-50/20 to-slate-50/40 p-5 shadow-xs backdrop-blur-sm transition-all duration-200 hover:border-indigo-400 hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-xl text-indigo-700 shadow-inner">
                          🩻
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            {t("reports_title")}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {t("reports_subtitle")}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60">
                        Imaging / Labs
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
                      className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                        isReportDragging
                          ? "border-indigo-500 bg-indigo-50/80 scale-[1.01]"
                          : reportFile
                          ? "border-indigo-400 bg-indigo-50/40"
                          : "border-slate-300 bg-white/70 hover:border-indigo-400 hover:bg-indigo-50/30"
                      }`}
                    >
                      <input
                        ref={reportInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                        onChange={(e) =>
                          handleReportSelect(e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />

                      {reportFile ? (
                        <div className="space-y-1">
                          <span className="text-2xl">✓</span>
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[220px]">
                            {reportFile.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(reportFile.size / (1024 * 1024)).toFixed(2)} MB · Ready for Upload
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-2xl text-slate-400">📁</span>
                          <p className="text-xs font-bold text-slate-800">
                            Click or drag lab / scan file
                          </p>
                          <p className="text-[10px] text-slate-400">
                            PDF, JPG, PNG or DICOM scan
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {reportFile && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        Attached: Lab/Scan Report
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportFile(null);
                        }}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Action with Loading Steps */}
            <div className="border-t border-slate-100 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-4 text-base font-extrabold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-blue-500/35 active:scale-98 disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{loadingStep || t("booking_processing")}</span>
                  </span>
                ) : (
                  t("book_visit")
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          MediBridge AI · Real-time Token Issuance & Supabase Cloud Persistence
        </p>
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        MediBridge AI · Encrypted Patient Consultation Pipeline
      </footer>
    </div>
  );
}
