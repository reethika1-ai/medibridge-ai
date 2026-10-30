"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/context/LanguageContext";
import OtpAuthModal from "@/components/OtpAuthModal";
import { sendBookingConfirmationSms, dispatchBookingSms } from "@/lib/sms";
import { DEMO_SAMPLE_PRESCRIPTION, DEMO_SAMPLE_XRAY } from "@/lib/cloudinary";

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
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [smsSentNotice, setSmsSentNotice] = useState<string | null>(null);

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

  // Hydration & SSR Safe Date Guard
  const [minDate, setMinDate] = useState<string>("");

  // Scheduling Fields
  const [department, setDepartment] = useState("General Medicine");
  const [doctor, setDoctor] = useState(departmentDoctors["General Medicine"][0]);
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState(timeSlots[0]);

  // Hourly Slot Capacity State (Max 8 patients per 1-hour slot)
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    // Runs safely on the client
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const formatted = `${yyyy}-${mm}-${dd}`;
    setMinDate(formatted);

    // If no date or past date is selected, set it to today
    setDate((prev) => (!prev || prev < formatted ? formatted : prev));

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("medibridge_patient_auth");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.phone && parsed.verified) {
            setPhone(parsed.phone);
            if (parsed.name) setName(parsed.name);
            setIsPhoneVerified(true);
            return;
          }
        } catch {}
      }
      setIsOtpModalOpen(true);
    }
  }, []);

  const minSelectableDate = minDate;
  const todayStr = minDate;
  const today = minDate;

  useEffect(() => {
    if (!date) return;
    let isMounted = true;
    async function fetchSlotAvailability() {
      setLoadingSlots(true);
      try {
        const res = await fetch(`/api/appointment/slot-availability?date=${encodeURIComponent(date)}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.slot_counts) {
            setSlotCounts(json.slot_counts);
            // If currently selected slot is full (8/8), auto-advance to next available slot
            const currentCount = json.slot_counts[time] || 0;
            if (currentCount >= 8) {
              const nextAvailable = timeSlots.find((ts) => (json.slot_counts[ts] || 0) < 8);
              if (nextAvailable) {
                setTime(nextAvailable);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch slot availability:", err);
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    }

    fetchSlotAvailability();
    return () => {
      isMounted = false;
    };
  }, [date]);

  // Triple Document Upload States
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [bloodReportFile, setBloodReportFile] = useState<File | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [isPrescriptionDragging, setIsPrescriptionDragging] = useState(false);
  const [isBloodDragging, setIsBloodDragging] = useState(false);
  const [isReportDragging, setIsReportDragging] = useState(false);

  const prescriptionInputRef = useRef<HTMLInputElement>(null);
  const bloodReportInputRef = useRef<HTMLInputElement>(null);
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

  function handleBloodSelect(file: File | null) {
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setErrorMsg(`Blood Report: ${err}`);
      return;
    }
    setErrorMsg("");
    setBloodReportFile(file);
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

  const handleLoadSamplePrescription = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const res = await fetch(DEMO_SAMPLE_PRESCRIPTION);
      const blob = await res.blob();
      const file = new File([blob], "sample_prescription.jpg", { type: "image/jpeg" });
      handlePrescriptionSelect(file);
    } catch {
      const fallbackFile = new File(["sample_rx"], "sample_prescription.jpg", { type: "image/jpeg" });
      handlePrescriptionSelect(fallbackFile);
    }
  };

  const handleLoadSampleXray = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const res = await fetch(DEMO_SAMPLE_XRAY);
      const blob = await res.blob();
      const file = new File([blob], "sample_radiograph_xray.jpg", { type: "image/jpeg" });
      handleReportSelect(file);
    } catch {
      const fallbackFile = new File(["sample_xray"], "sample_radiograph_xray.jpg", { type: "image/jpeg" });
      handleReportSelect(fallbackFile);
    }
  };

  async function uploadToCloudinary(
    file: File,
    token: string,
    docType: "prescription" | "report" | "blood_report"
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
    if (!isPhoneVerified) {
      setErrorMsg("Mandatory mobile verification required before appointment booking. Please verify with OTP.");
      setIsOtpModalOpen(true);
      return;
    }
    if (!date) {
      setErrorMsg("Please select an appointment date.");
      return;
    }
    if (minDate && date < minDate) {
      setErrorMsg(
        t("date_guard_error") ||
          "Appointments cannot be booked for past dates. Please select today or a future date."
      );
      return;
    }
    const currentSlotCount = slotCounts[time] || 0;
    if (currentSlotCount >= 8) {
      setErrorMsg(
        t("slot_capacity_error") ||
          "Selected time slot is at maximum capacity (8/8 patients). Please choose another slot."
      );
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

      let blood_report_url: string | null = null;
      let blood_report_public_id: string | null = null;
      let blood_report_text = "";

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

      // 2. Upload Recent Blood Reports if provided
      if (bloodReportFile) {
        setLoadingStep("Uploading recent blood reports & lab panels to vault...");
        const bloodUpload = await uploadToCloudinary(bloodReportFile, token, "blood_report");
        blood_report_url = bloodUpload.secure_url;
        blood_report_public_id = bloodUpload.public_id;
        blood_report_text = bloodUpload.extracted_text;
      }

      // 3. Upload Medical Reports & Scans if provided
      if (reportFile) {
        setLoadingStep("Uploading medical reports & imaging to Cloudinary vault...");
        const reportUpload = await uploadToCloudinary(reportFile, token, "report");
        report_url = reportUpload.secure_url;
        report_public_id = reportUpload.public_id;
        report_text = reportUpload.extracted_text;
      }

      // Backward compatibility mapping for single document_url
      const document_url = report_url || blood_report_url || prescription_url || null;

      // 4. Deep Clinical Analysis via MediBridge Clinical Intelligence Engine
      setLoadingStep("Synthesizing deep clinical assessment with AI Engine...");
      let triageData: any = null;
      try {
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

      // 5. Register Appointment in Supabase
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
          urgent:
            triageData?.urgency_level === "URGENT" ||
            triageData?.urgency_level === "CRITICAL_RED_ALERT" ||
            triageData?.urgency_level === "Urgent" ||
            Boolean(triageData?.urgent_flag),
          prescription_url,
          blood_report_url,
          report_url,
          document_url,
          report_public_id:
            report_public_id || blood_report_public_id || prescription_public_id || null,
          payment_mode: paymentMode,
          payment_status: paymentMode === "ONLINE" ? "PAID" : "PENDING_COUNTER",
          early_mobilization: false,
          summary: triageData || {
            chief_complaint: symptoms.slice(0, 80),
            summary: symptoms,
            clinical_observations: symptoms,
            urgency_level: "ROUTINE",
            payment_mode: paymentMode,
            payment_status: paymentMode === "ONLINE" ? "PAID" : "PENDING_COUNTER",
            early_mobilization: false,
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

      // Dispatch automated Fast2SMS booking confirmation with 20-min advance arrival notice
      try {
        const computedSpot = (slotCounts[time] || 0) + 1;
        await sendBookingConfirmationSms({
          phone: phone.trim(),
          patientName: name.trim(),
          token,
          doctorName: doctor,
          date,
          timeSlot: time,
          queueSpot: computedSpot,
        });
      } catch (smsErr) {
        console.warn("Fast2SMS delivery notification skipped:", smsErr);
      }

      router.push(
        `/appointment/token?token=${encodeURIComponent(token)}&name=${encodeURIComponent(
          name.trim()
        )}&dept=${encodeURIComponent(department)}&doctor=${encodeURIComponent(
          doctor
        )}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&payment_mode=${encodeURIComponent(paymentMode)}`
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
                  readOnly={isPhoneVerified && Boolean(name)}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("patient_name_placeholder")}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3.5 text-sm font-semibold outline-none transition-all duration-200 ${
                    isPhoneVerified && Boolean(name)
                      ? "bg-emerald-50/40 border-emerald-300 text-slate-900 cursor-not-allowed"
                      : "bg-slate-50/50 border-slate-300 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  }`}
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
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="patient-phone"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    {t("phone")} <span className="text-rose-500">*</span>
                  </label>
                  {isPhoneVerified ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                        ✓ Phone Verified via OTP
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsOtpModalOpen(true)}
                        className="text-[10px] font-bold text-teal-700 hover:underline"
                      >
                        [Change]
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsOtpModalOpen(true)}
                      className="rounded-full bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-0.5 text-[10px] font-black text-teal-800 transition"
                    >
                      📱 Verify via OTP
                    </button>
                  )}
                </div>
                <input
                  id="patient-phone"
                  type="tel"
                  required
                  readOnly={isPhoneVerified}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("phone_placeholder")}
                  className={`mt-2 w-full rounded-2xl border px-4 py-3.5 text-sm font-semibold outline-none transition-all duration-200 ${
                    isPhoneVerified
                      ? "bg-emerald-50/40 border-emerald-300 text-slate-900 cursor-not-allowed"
                      : "bg-slate-50/50 border-slate-300 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  }`}
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

            {/* Date and Time Slot Grid with Dynamic Guard & Capacity Limiter */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="apt-date"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    {t("appointment_date")} <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                    Today & Future Only
                  </span>
                </div>
                <input
                  id="apt-date"
                  type="date"
                  required
                  min={minDate || undefined}
                  value={date}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    if (minDate && (!chosen || chosen < minDate)) {
                      setErrorMsg(
                        t("date_guard_error") ||
                          "Appointments cannot be booked for past dates. Please select today or a future date."
                      );
                      setDate(minDate);
                    } else {
                      setErrorMsg("");
                      setDate(chosen);
                    }
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="apt-time"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    {t("appointment_time")} <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    {loadingSlots ? "Checking capacity..." : "Max 8 Patients / Slot"}
                  </span>
                </div>
                <select
                  id="apt-time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  {timeSlots.map((ts) => {
                    const count = slotCounts[ts] || 0;
                    const isFull = count >= 8;
                    return (
                      <option key={ts} value={ts} disabled={isFull}>
                        {ts} {isFull ? `(${t("slot_full") || "8/8 Full - Locked"})` : `(${count}/8 ${t("in_this_slot") || "booked"})`}
                      </option>
                    );
                  })}
                </select>

                {/* Quick Hourly Slot Capacity Chips */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {timeSlots.map((ts) => {
                    const count = slotCounts[ts] || 0;
                    const isFull = count >= 8;
                    const isSelected = time === ts;
                    return (
                      <button
                        key={ts}
                        type="button"
                        disabled={isFull}
                        onClick={() => setTime(ts)}
                        title={isFull ? "Slot at maximum capacity (8/8)" : `Click to select ${ts}`}
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all ${
                          isFull
                            ? "bg-slate-100 text-slate-400 line-through cursor-not-allowed border border-slate-200 opacity-60"
                            : isSelected
                            ? "bg-[#00A896] text-white shadow-xs ring-2 ring-teal-400/40"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60"
                        }`}
                      >
                        <span>{ts}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                            isFull
                              ? "bg-rose-100 text-rose-700"
                              : isSelected
                              ? "bg-white/20 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {count}/8
                        </span>
                      </button>
                    );
                  })}
                </div>
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

              {/* Hackathon 1-Click Evaluation Triggers */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-teal-200/80 bg-teal-50/70 p-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-100 text-teal-800 text-xs font-black">
                    ⚡
                  </span>
                  <span className="text-xs font-bold text-teal-950">
                    Instant Hackathon Evaluation Samples:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadSamplePrescription}
                    className="inline-flex items-center gap-1.5 rounded-full border border-teal-300 bg-white px-3 py-1 text-xs font-black text-teal-800 shadow-xs hover:bg-teal-100 transition active:scale-95"
                  >
                    <span>📄</span>
                    <span>Test Sample Prescription</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSampleXray}
                    className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300 bg-white px-3 py-1 text-xs font-black text-indigo-800 shadow-xs hover:bg-indigo-50 transition active:scale-95"
                  >
                    <span>🩻</span>
                    <span>Test Sample X-Ray</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
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
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleLoadSamplePrescription}
                          className="rounded-full bg-blue-100/70 hover:bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60 transition"
                        >
                          + Sample Rx
                        </button>
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200/60">
                          Sarvam OCR
                        </span>
                      </div>
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
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                            {prescriptionFile.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(prescriptionFile.size / (1024 * 1024)).toFixed(2)} MB · Ready
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-2xl text-slate-400">📤</span>
                          <p className="text-xs font-bold text-slate-800">
                            {t("click_or_drag_rx")}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {t("upload_specs")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {prescriptionFile && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {t("attached_prefix")} Rx Note
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrescriptionFile(null);
                        }}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        {t("remove_file")}
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Dedicated Recent Blood Reports / Lab Panels Box */}
                <div className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-rose-50/20 to-slate-50/40 p-5 shadow-xs backdrop-blur-sm transition-all duration-200 hover:border-rose-400 hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-xl text-rose-700 shadow-inner">
                          🩸
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            {t("blood_report_title") || "Recent Blood Reports"}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {t("blood_report_subtitle") || "CBC, LFT, KFT, Lipid Profile"}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200/60">
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
                      onClick={() => bloodReportInputRef.current?.click()}
                      className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                        isBloodDragging
                          ? "border-rose-500 bg-rose-50/80 scale-[1.01]"
                          : bloodReportFile
                          ? "border-rose-400 bg-rose-50/40"
                          : "border-slate-300 bg-white/70 hover:border-rose-400 hover:bg-rose-50/30"
                      }`}
                    >
                      <input
                        ref={bloodReportInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                        onChange={(e) =>
                          handleBloodSelect(e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />

                      {bloodReportFile ? (
                        <div className="space-y-1">
                          <span className="text-2xl">✓</span>
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                            {bloodReportFile.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(bloodReportFile.size / (1024 * 1024)).toFixed(2)} MB · Ready
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-2xl text-slate-400">🩸</span>
                          <p className="text-xs font-bold text-slate-800">
                            {t("click_or_drag_blood") || "Click or drag blood report"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {t("upload_specs")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {bloodReportFile && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        {t("attached_blood") || "Attached: Blood Report"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBloodReportFile(null);
                        }}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        {t("remove_file")}
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Medical Reports & Scans Box */}
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
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleLoadSampleXray}
                          className="rounded-full bg-indigo-100/70 hover:bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60 transition"
                        >
                          + Sample X-Ray
                        </button>
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/60">
                          Imaging / X-Ray
                        </span>
                      </div>
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
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                            {reportFile.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(reportFile.size / (1024 * 1024)).toFixed(2)} MB · Ready
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-2xl text-slate-400">📁</span>
                          <p className="text-xs font-bold text-slate-800">
                            {t("click_or_drag_report")}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {t("upload_specs")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {reportFile && (
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        {t("attached_prefix")} Scan / Report
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportFile(null);
                        }}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        {t("remove_file")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* DUAL PAYMENT MODES */}
            <div className="border-t border-slate-100 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-teal-700">
                    Payment Mode & Refund Policy
                  </span>
                  <h4 className="mt-0.5 text-sm font-bold text-slate-900">
                    Choose Consultation Settlement Mode (Standard OPD Fee: ₹500)
                  </h4>
                </div>
                <span className="rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-black text-teal-800 self-start sm:self-auto">
                  Fixed Fee: ₹500
                </span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {/* Mode 1: Online Demo Pay */}
                <div
                  onClick={() => setPaymentMode("ONLINE")}
                  className={`relative cursor-pointer rounded-3xl border-2 p-5 transition-all duration-200 ${
                    paymentMode === "ONLINE"
                      ? "border-[#00A896] bg-teal-50/40 shadow-md ring-2 ring-teal-400/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-xl text-teal-700">
                        💳
                      </span>
                      <div>
                        <span className="font-black text-slate-900 text-sm block">Online Demo Pay (UPI/Cards)</span>
                        <span className="text-[10px] text-slate-500">Instant Mock Settlement · ₹500</span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payment_mode"
                      checked={paymentMode === "ONLINE"}
                      onChange={() => setPaymentMode("ONLINE")}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                    />
                  </div>

                  <div className="mt-3.5 space-y-1.5 border-t border-teal-100 pt-3 text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md text-[10px]">
                      ✓ 75% Refund Policy (&gt;3h Cancellation)
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Cancel up to <strong>3 hours prior</strong> to scheduled slot for a guaranteed <strong>75% refund (₹375)</strong> credited to source. Instant mock payment confirmation.
                    </p>
                  </div>
                </div>

                {/* Mode 2: Offline Pay at Hospital */}
                <div
                  onClick={() => setPaymentMode("OFFLINE")}
                  className={`relative cursor-pointer rounded-3xl border-2 p-5 transition-all duration-200 ${
                    paymentMode === "OFFLINE"
                      ? "border-[#00A896] bg-teal-50/40 shadow-md ring-2 ring-teal-400/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-xl text-amber-700">
                        🏥
                      </span>
                      <div>
                        <span className="font-black text-slate-900 text-sm block">Pay at Hospital (Offline)</span>
                        <span className="text-[10px] text-slate-500">OPD Registration Billing Desk</span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="payment_mode"
                      checked={paymentMode === "OFFLINE"}
                      onChange={() => setPaymentMode("OFFLINE")}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                    />
                  </div>

                  <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md text-[10px]">
                      ⚠️ Desk Settlement · Non-Cancellable Online
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Pay ₹500 directly at the hospital reception/billing desk upon arrival. Online cancellation is not permitted for offline bookings.
                    </p>
                  </div>
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
        <OtpAuthModal
          isOpen={isOtpModalOpen}
          initialName={name}
          initialPhone={phone}
          onClose={() => setIsOtpModalOpen(false)}
          onSuccess={(userData) => {
            setName(userData.name);
            setPhone(userData.phone);
            setIsPhoneVerified(true);
            if (typeof window !== "undefined") {
              localStorage.setItem(
                "medibridge_patient_auth",
                JSON.stringify({
                  name: userData.name,
                  phone: userData.phone,
                  verified: true,
                  verifiedAt: new Date().toISOString(),
                })
              );
            }
            setErrorMsg("");
          }}
        />
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        MediBridge AI · Encrypted Patient Consultation Pipeline
      </footer>
    </div>
  );
}
