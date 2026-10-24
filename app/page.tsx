import Link from "next/link";
import Navbar from "@/components/Navbar";

const coreFeatures = [
  {
    icon: "🗓️",
    title: "Instant Appointment Booking",
    desc: "Seamlessly select clinical department, physician, and consultation slot with real-time unique token generation (#A023 / MB-743721).",
    badge: "Token-Enabled",
    gradient: "from-blue-500/10 to-indigo-500/10",
    link: "/appointment",
  },
  {
    icon: "🤖",
    title: "xAI Grok Clinical Summary",
    desc: "Grok Cloud intelligence synthesizes patient symptoms into structured chief complaints, key observations, and urgent red-flag alerts.",
    badge: "AI Powered",
    gradient: "from-indigo-500/10 to-purple-500/10",
    link: "/patient-details",
  },
  {
    icon: "📁",
    title: "Cloudinary Document Vault",
    desc: "High-speed encrypted document repository for lab results, radiology PDFs, and clinical prescriptions with instant previews.",
    badge: "Encrypted Storage",
    gradient: "from-cyan-500/10 to-blue-500/10",
    link: "/patient-details",
  },
  {
    icon: "🩺",
    title: "Doctor Urgency Queue",
    desc: "Physician triage board automatically prioritizing high-risk patients with quick status toggles (Waiting ⇋ Completed).",
    badge: "Physician Portal",
    gradient: "from-emerald-500/10 to-teal-500/10",
    link: "/doctor",
  },
  {
    icon: "⚡",
    title: "Patient Live Dashboard",
    desc: "Live tracker displaying active queue position, token status badge, confirmed appointment slip, and attached medical reports.",
    badge: "Live Status",
    gradient: "from-blue-500/10 to-cyan-500/10",
    link: "/patient/dashboard",
  },
  {
    icon: "🛡️",
    title: "Protected Doctor Auth",
    desc: "Secure clinical access with httpOnly authenticated session cookies and protected triage patient records.",
    badge: "HIPAA Compliant",
    gradient: "from-amber-500/10 to-rose-500/10",
    link: "/doctor/login",
  },
  {
    icon: "📋",
    title: "Multi-Department Routing",
    desc: "Direct appointment matching across Cardiology, Neurology, Dermatology, Orthopedics, Pediatrics, and Internal Medicine.",
    badge: "Smart Dispatch",
    gradient: "from-violet-500/10 to-indigo-500/10",
    link: "/appointment",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main className="flex-1">
        {/* Hero Elevation Section */}
        <section className="relative overflow-hidden bg-gradient-to-tr from-slate-50 via-blue-50/50 to-indigo-50/30 py-16 sm:py-24 lg:py-28 border-b border-slate-100/80">
          {/* Subtle Ambient Radial Glows */}
          <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-blue-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 left-10 h-96 w-96 rounded-full bg-indigo-400/15 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-7">
                {/* Pill Announcement */}
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-blue-700 shadow-xs backdrop-blur-sm">
                  <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                  <span>MediBridge AI Healthcare Operating System</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-800">
                    Next.js 16 + Grok
                  </span>
                </div>

                <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.12]">
                  Bridging Patients & Doctors with{" "}
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                    Intelligent AI Triage
                  </span>
                </h1>

                <p className="mt-6 max-w-2xl text-base text-slate-600 leading-relaxed sm:text-lg">
                  Eliminate clinic wait confusion. Generate unique appointment tokens, upload medical reports directly to a secure Cloudinary vault, and provide doctors with structured xAI Grok clinical summaries in seconds.
                </p>

                {/* CTAs with hover scale & micro-interactions */}
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    href="/appointment"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-7 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/35 active:scale-95"
                  >
                    <span>Book Appointment Now</span>
                    <span className="text-lg">→</span>
                  </Link>

                  <Link
                    href="/patient/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-bold text-slate-700 shadow-xs transition-all duration-300 hover:scale-105 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md active:scale-95"
                  >
                    <span>Patient Dashboard</span>
                  </Link>

                  <Link
                    href="/doctor"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200/80 bg-blue-50/70 px-5 py-4 text-base font-bold text-blue-800 transition-all duration-300 hover:scale-105 hover:bg-blue-100 hover:shadow-sm active:scale-95"
                  >
                    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Physician Queue</span>
                  </Link>
                </div>

                {/* Trust Indicators with Navy & Blue Highlights */}
                <div className="mt-12 flex flex-wrap items-center gap-4 sm:gap-6 border-t border-slate-200/70 pt-6">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 items-center rounded-full bg-blue-100/80 px-2.5 text-xs font-black text-blue-900 shadow-xs">
                      50K+
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      Patients Trusted
                    </span>
                  </div>

                  <div className="hidden h-4 w-px bg-slate-300 sm:block" />

                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 items-center rounded-full bg-indigo-100/80 px-2.5 text-xs font-black text-indigo-900 shadow-xs">
                      99.4%
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      Clinical Accuracy
                    </span>
                  </div>

                  <div className="hidden h-4 w-px bg-slate-300 sm:block" />

                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 items-center rounded-full bg-cyan-100/80 px-2.5 text-xs font-black text-cyan-900 shadow-xs">
                      &lt; 2 Min
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      Avg. Intake Speed
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Consultation Preview Card */}
              <div className="lg:col-span-5">
                <div className="relative rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur-sm transition-all duration-300 hover:shadow-blue-500/15 sm:p-7">
                  {/* Decorative glowing gradient tag */}
                  <div className="absolute -top-3.5 right-6 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                    Live Demo State
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 font-black text-white shadow-md shadow-blue-500/20">
                        MB
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-slate-900">Patient Consultation Slip</h2>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Active
                          </span>
                        </div>
                        <p className="font-mono text-xs font-extrabold text-blue-700">Token: #MB-743721</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {/* Department badge */}
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5 transition-colors hover:bg-blue-50/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-blue-950">Department & Physician</span>
                        <span className="font-semibold text-blue-700">Cardiology</span>
                      </div>
                      <p className="mt-1 text-sm font-extrabold text-slate-900">Dr. Sarah Vance, MD</p>
                      <p className="text-[11px] text-slate-500">Scheduled: Today @ 10:30 AM</p>
                    </div>

                    {/* AI Grok Urgency Alert */}
                    <div className="rounded-2xl border border-rose-200/80 bg-rose-50/60 p-3.5 transition-colors hover:bg-rose-50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-rose-950">xAI Grok Intake Status</span>
                        <span className="inline-flex items-center gap-1 font-black text-rose-700">
                          <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                          Urgent Flagged
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-800 leading-snug">
                        Chief Complaint: Intermittent severe chest tightness with dyspnea on exertion.
                      </p>
                    </div>

                    {/* Vault Document */}
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 transition-colors hover:bg-slate-100/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Cloudinary Document Vault</span>
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          Encrypted
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-blue-700">
                        📄 ECG_Resting_Lead12_Oct2026.pdf
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/appointment"
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-center text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-slate-800 hover:shadow-lg active:scale-98"
                  >
                    <span>Test Instant Booking Flow</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7 Core Feature Grid */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-blue-700 border border-blue-200/60">
                End-To-End Clinical Architecture
              </span>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                7 Pillars of MediBridge AI
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
                Engineered with high aesthetic standards for modern hospitals, medical centers, and outpatient clinics.
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {coreFeatures.map((f) => (
                <Link
                  key={f.title}
                  href={f.link}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-50 to-blue-50/80 text-3xl shadow-inner transition-transform duration-300 group-hover:scale-110">
                        {f.icon}
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-700">
                        {f.badge}
                      </span>
                    </div>

                    <h3 className="mt-6 text-xl font-bold text-slate-900 transition-colors group-hover:text-blue-600">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {f.desc}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-blue-600 transition-all duration-200 group-hover:gap-2.5">
                    <span>Explore module</span>
                    <span>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 4-Step Clinical Journey Workflow */}
        <section className="border-t border-slate-200/80 bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="text-xs font-black uppercase tracking-wider text-blue-600">
                Patient & Clinician Path
              </span>
              <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
                How MediBridge AI Streamlines Care
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-4">
              <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-6 transition-all duration-300 hover:shadow-md hover:bg-white hover:border-blue-100">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                  1
                </span>
                <h4 className="mt-4 text-base font-bold text-slate-900">Book Appointment</h4>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  Select department, choose physician, and lock in consultation date & time.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-6 transition-all duration-300 hover:shadow-md hover:bg-white hover:border-blue-100">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">
                  2
                </span>
                <h4 className="mt-4 text-base font-bold text-slate-900">Instant Token</h4>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  Unique token issued and stored in Supabase with zero duplicate collision.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-6 transition-all duration-300 hover:shadow-md hover:bg-white hover:border-blue-100">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-xs font-black text-white">
                  3
                </span>
                <h4 className="mt-4 text-base font-bold text-slate-900">Grok AI Intake</h4>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  Upload reports to Cloudinary and let Grok extract chief complaints & red flags.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-6 transition-all duration-300 hover:shadow-md hover:bg-white hover:border-blue-100">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                  4
                </span>
                <h4 className="mt-4 text-base font-bold text-slate-900">Physician Review</h4>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  Doctor views prioritized patient list with quick-toggle consultation statuses.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2">
            <span className="text-base font-black tracking-tight text-slate-900">MediBridge</span>
            <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-xs font-black text-white">AI</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Clinical AI Platform for Modern Healthcare Providers. Powered by Next.js 16, Supabase, Cloudinary & xAI Grok.
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Notice: MediBridge AI assists clinical decision workflows and does not replace professional medical judgment.
          </p>
        </div>
      </footer>
    </div>
  );
}