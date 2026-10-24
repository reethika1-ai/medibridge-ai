"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

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

export default function AppointmentPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("General Medicine");
  const [doctor, setDoctor] = useState(departmentDoctors["General Medicine"][0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState(timeSlots[0]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  function handleDepartmentChange(selectedDept: string) {
    setDepartment(selectedDept);
    const docs = departmentDoctors[selectedDept] || [];
    setDoctor(docs[0] || "Attending Physician");
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Please enter the patient's full name.");
      return;
    }
    if (!date) {
      setErrorMsg("Please select an appointment date.");
      return;
    }

    setLoading(true);

    try {
      const randNum = Math.floor(100000 + Math.random() * 900000);
      const token = `MB-${randNum}`;

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          patient_name: name.trim(),
          department: `${department} - ${doctor.split(",")[0]}`,
          appointment_date: `${date} @ ${time}`,
          urgent: false,
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
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-blue-50/30 to-indigo-50/20 text-slate-900 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 transition hover:text-blue-800"
        >
          ← Return to Overview
        </Link>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xl shadow-blue-500/5 sm:p-10">
          <div className="border-b border-slate-100 pb-6">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-700 border border-blue-200/60">
                Step 1 of Consultation
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Fast Digital Triage
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Book Your Appointment
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Complete your patient consultation profile to instantly receive an official clinic token (#A023 / MB-743721) linked to your records.
            </p>
          </div>

          {errorMsg && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleBook} className="mt-8 space-y-6">
            {/* Patient Name with Animated Focus States */}
            <div>
              <label htmlFor="patient-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Patient Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="patient-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Eleanor Vance"
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Department and Doctor Selection Grid */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="dept-select" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Clinical Specialty <span className="text-rose-500">*</span>
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
                <label htmlFor="doc-select" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Select Physician <span className="text-rose-500">*</span>
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
                <label htmlFor="apt-date" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Consultation Date <span className="text-rose-500">*</span>
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
                <label htmlFor="apt-time" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Time Slot <span className="text-rose-500">*</span>
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
                    <span>Generating Token & Registering...</span>
                  </span>
                ) : (
                  "Confirm & Issue Official Token →"
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