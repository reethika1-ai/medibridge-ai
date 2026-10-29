import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "SELF_ARRIVAL" ? "SELF_ARRIVAL" : "AMBULANCE";
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const nowIso = new Date().toISOString();
    const today = nowIso.split("T")[0]; // Valid Postgres date YYYY-MM-DD

    const lat =
      body.latitude !== undefined && body.latitude !== null
        ? String(body.latitude)
        : "17.4435° N";
    const lon =
      body.longitude !== undefined && body.longitude !== null
        ? String(body.longitude)
        : "78.3772° E";
    const location =
      body.location ||
      (body.latitude ? `${lat}, ${lon}` : "City Trauma Center Hub / GPS Fix");
    const notes =
      body.notes ||
      (mode === "AMBULANCE"
        ? "Critical Roadside Casualty"
        : "Private Vehicle / Rapid Transit");

    const token =
      mode === "AMBULANCE"
        ? `EMG-AMB-${randNum}`
        : `EMG-GATE-${randNum}`;

    const patientName =
      mode === "AMBULANCE"
        ? "🚨 CRITICAL TRAUMA (Ambulance Dispatched)"
        : "🚨 INCOMING TRAUMA (Self-Arrival at Gate 1)";

    const symptoms =
      mode === "AMBULANCE"
        ? `[AMBULANCE DISPATCHED] Unit #MED-09 deployed to: ${location || `GPS (${lat},${lon})`}. Immediate trauma response required.`
        : `[SELF-ARRIVAL GATE 1] Private vehicle inbound: ${notes || "Emergency Transit"}. Mobilize stretcher, Nurse Stephanie, and Trauma Bay 1.`;

    const clinicalSummaryObj = {
      mode: mode || "AMBULANCE",
      location: location || `${lat}, ${lon}`,
      ambulance_id: "Smart AV-Ambulance #MED-09",
      unit_assigned:
        mode === "AMBULANCE"
          ? "Smart AV-Ambulance #MED-09 (Autonomous Trauma Fleet)"
          : "Gate 1 ER Rapid Mobilization Unit",
      eta_mins: 5,
      nurse_assigned: "Staff Nurse Stephanie",
      vehicle_notes: notes || "Private Transit",
      notes: notes || "Private Transit",
      dispatched_at: nowIso,
      urgency_level: "CRITICAL_RED_ALERT",
      urgent_flag: true,
      status: "Waiting",
      age: 30,
      gender: "Emergency",
      phone: "108-EMERGENCY",
      specialty: "Emergency & Trauma Care",
      chief_complaint: patientName,
      clinical_observations: symptoms,
    };
    const clinicalSummaryJson = JSON.stringify(clinicalSummaryObj);

    // Verified standard columns in Supabase appointments table
    const verifiedPayload = {
      token,
      patient_name: patientName,
      department: "Emergency & Trauma Care",
      appointment_date: today,
      symptoms,
      summary: clinicalSummaryJson,
      urgent: true,
    };

    let { data, error } = await supabase
      .from("appointments")
      .insert(verifiedPayload)
      .select()
      .single();

    if (error) {
      console.error("Emergency Supabase Error:", error);
      return NextResponse.json(
        {
          error: "Emergency Supabase Error: " + error.message,
          code: error.code,
          details: error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      token,
      mode,
      patient_name: patientName,
      ambulance_id:
        mode === "AMBULANCE" ? "Smart AV-Ambulance #MED-09" : undefined,
      unit_assigned:
        mode === "AMBULANCE"
          ? "Smart AV-Ambulance #MED-09 (Autonomous Trauma Fleet)"
          : "Gate 1 ER Rapid Mobilization Unit",
      eta_mins: 5,
      location,
      notes,
      latitude: lat,
      longitude: lon,
      created_at: nowIso,
      data,
    });
  } catch (error) {
    console.error("Emergency Route Exception:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Emergency dispatch processing failed",
      },
      { status: 500 }
    );
  }
}
