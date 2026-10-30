import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import HospitalPortalClient from "@/components/HospitalPortalClient";
import { AppointmentItem } from "@/components/DoctorQueueClient";

async function HospitalPortalData() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("doctor_auth")?.value;
  const passkey = cookieStore.get("doctor_passkey")?.value;

  // Protect /hospital: check session or cookie passkey ('medibridge2026')
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
        parsedSummary =
          typeof item.summary === "string" ? JSON.parse(item.summary) : item.summary;
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

    const age = item.age ?? parsedSummary?.age ?? null;
    const gender = item.gender ?? parsedSummary?.gender ?? null;
    const phone = item.phone ?? parsedSummary?.phone ?? null;
    const payment_mode = item.payment_mode ?? parsedSummary?.payment_mode ?? "ONLINE";
    const early_mobilization = item.early_mobilization ?? parsedSummary?.early_mobilization ?? false;
    const refund_amount = item.refund_amount ?? parsedSummary?.refund_amount ?? null;
    const refund_status = item.refund_status ?? parsedSummary?.refund_status ?? null;

    return {
      ...item,
      age,
      gender,
      phone,
      payment_mode,
      early_mobilization,
      refund_amount,
      refund_status,
      status,
      prescription_url,
      report_url,
      document_url,
      parsed_summary: parsedSummary,
    };
  });

  return <HospitalPortalClient initialAppointments={formattedAppointments} />;
}

export default function HospitalPage() {
  return (
    <div className="relative min-h-screen bg-[#F4F7F9] text-slate-800 selection:bg-[#00A896] selection:text-white flex flex-col justify-between">
      {/* Main Content Layer */}
      <div className="relative z-10 flex flex-col flex-1 justify-between">
        <Navbar theme="light" />

        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1">
          {/* Hospital Header Banner */}
          <section className="mb-8 relative overflow-hidden rounded-[2.2rem] bg-gradient-to-r from-[#00A896] via-[#028090] to-[#02C39A] p-7 sm:p-10 text-white shadow-xl shadow-teal-900/10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute left-1/3 -bottom-20 h-56 w-56 rounded-full bg-teal-300/20 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-bold text-teal-50 border border-white/20 backdrop-blur-md">
                  <span className="flex h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
                  <span>Hospital Operations & Clinical Command</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white">
                    Multi-Department Hub
                  </span>
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl text-white">
                  Multi-Department Hospital Portal
                </h1>
                <p className="mt-2 max-w-2xl text-teal-50/90 text-xs sm:text-sm leading-relaxed">
                  Unified command console for Doctor Clinical Triage, Autonomous Ambulance Fleet Telemetry, and Gate 1 Emergency Mobilization.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md text-xs shadow-xs">
                  <span className="text-teal-100">Hospital Staff Session</span>
                  <p className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    Authorized Clinician / Staff
                  </p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md text-xs shadow-xs">
                  <span className="text-teal-100">Integrated Engines</span>
                  <p className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-300" />
                    Triage AI, Fleet GPS & Gate 1 Active
                  </p>
                </div>
              </div>
            </div>
          </section>

          <Suspense
            fallback={
              <div className="rounded-[2rem] border border-slate-100 bg-white p-14 text-center text-slate-400 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#00A896] border-t-transparent" />
                <p className="mt-4 text-xs font-bold tracking-wide text-slate-500 uppercase">
                  Synchronizing Hospital Multi-Department Queue...
                </p>
              </div>
            }
          >
            <HospitalPortalData />
          </Suspense>
        </main>

        <footer className="border-t border-slate-100 bg-white py-6 text-center text-xs text-slate-500">
          MediBridge AI · HIPAA & Clinical Data Governance Protected Environment
        </footer>
      </div>
    </div>
  );
}

