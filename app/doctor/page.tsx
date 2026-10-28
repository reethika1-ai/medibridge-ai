import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import DoctorQueueClient, { AppointmentItem } from "@/components/DoctorQueueClient";

async function DoctorQueueData() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("doctor_auth")?.value;
  const passkey = cookieStore.get("doctor_passkey")?.value;

  // Protect /doctor: check session or cookie passkey ('medibridge2026')
  if (auth !== "authenticated" && passkey !== "medibridge2026") {
    redirect("/doctor-login");
  }

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("urgent", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-500/30 bg-rose-950/40 p-7 text-xs font-semibold text-rose-300 shadow-sm backdrop-blur-md">
        Failed to load patient records from Supabase: {error.message}
      </div>
    );
  }

  const formattedAppointments: AppointmentItem[] = (data || []).map((item) => {
    let parsedSummary: any = null;
    let status = "Waiting";

    if (item.summary) {
      try {
        parsedSummary = JSON.parse(item.summary);
        if (parsedSummary && typeof parsedSummary === "object" && parsedSummary.status) {
          status = parsedSummary.status;
        }
      } catch {
        // Plain text fallback
      }
    }

    const prescription_url =
      item.prescription_url || parsedSummary?.prescription_url || null;
    const report_url =
      item.report_url ||
      parsedSummary?.report_url ||
      (item.report_public_id
        ? `https://res.cloudinary.com/igssaucs/image/upload/${item.report_public_id}`
        : null);
    const document_url =
      item.document_url ||
      parsedSummary?.document_url ||
      report_url ||
      prescription_url ||
      null;

    return {
      ...item,
      status,
      parsed_summary: parsedSummary,
      prescription_url,
      report_url,
      document_url,
      age: item.age ?? parsedSummary?.age ?? null,
      gender: item.gender ?? parsedSummary?.gender ?? null,
      phone: item.phone ?? parsedSummary?.phone ?? null,
    };
  });

  return <DoctorQueueClient initialAppointments={formattedAppointments} />;
}

export default function DoctorPage() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      {/* Fixed Ambient Medical Background Image with Overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-10 z-0 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1920&q=80')`,
        }}
      />

      {/* Main Content Layer */}
      <div className="relative z-10 flex flex-col flex-1 justify-between">
        <Navbar theme="dark" />

        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
          {/* Physician Header Banner */}
          <section className="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900/90 via-blue-950/70 to-slate-900/90 border border-slate-800/80 p-7 sm:p-10 text-white shadow-2xl backdrop-blur-md">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3.5 py-1 text-xs font-bold text-blue-300 border border-blue-400/30 backdrop-blur-md">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Physician Live Triage Board</span>
                  <span className="rounded-full bg-blue-500/40 px-2 py-0.5 text-[10px] text-blue-100">
                    Real-Time Sync
                  </span>
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl text-white">
                  Clinical Queue & Triage
                </h1>
                <p className="mt-2 max-w-2xl text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Patients prioritized dynamically using clinical urgency indicators and arrival timestamps. Inspect Sarvam OCR medications, deep Grok clinical observations, lab findings, and dual document downloads.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur-md text-xs shadow-xs">
                  <span className="text-slate-400">Physician Session</span>
                  <p className="font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Authenticated Clinician
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur-md text-xs shadow-xs">
                  <span className="text-slate-400">Triage Engine</span>
                  <p className="font-bold text-blue-400 flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    xAI Grok & Sarvam OCR Active
                  </p>
                </div>
              </div>
            </div>
          </section>

          <Suspense
            fallback={
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-14 text-center text-slate-400 shadow-xl backdrop-blur-md">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                <p className="mt-4 text-xs font-bold tracking-wide text-slate-300 uppercase">
                  Synchronizing Physician Live Queue...
                </p>
              </div>
            }
          >
            <DoctorQueueData />
          </Suspense>
        </main>

        <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
          MediBridge AI · HIPAA & Clinical Data Governance Protected Environment
        </footer>
      </div>
    </div>
  );
}
