import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "SELF_ARRIVAL" ? "SELF_ARRIVAL" : "AMBULANCE";
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const nowIso = new Date().toISOString();

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
        ? `[AMBULANCE DISPATCHED] Unit #MED-09 En Route to: ${location || "GPS Pin: " + lat + ", " + lon}. Critical roadside casualty triage required.`
        : `[SELF-ARRIVAL GATE 1] Patient arriving via private vehicle (${notes || "Emergency Transit"}). Immediate stretcher, nurse, and Trauma Bay 1 readiness required.`;

    const clinicalSummaryObj = {
      mode,
      location: location || `${lat}, ${lon}`,
      ambulance_id: "Smart AV-Ambulance #MED-09",
      unit_assigned:
        mode === "AMBULANCE"
          ? "Smart AV-Ambulance #MED-09 (Autonomous Trauma Fleet)"
          : "Gate 1 ER Rapid Mobilization Unit",
      eta_mins: 5,
      nurse_assigned: "Staff Nurse Stephanie (Trauma Bay 1)",
      notes: notes || "Priority Gate Mobilization",
      dispatched_at: nowIso,
      urgency_level: "CRITICAL_RED_ALERT",
      urgent_flag: true,
      status: "Waiting",
      chief_complaint: patientName,
      clinical_observations: symptoms,
    };
    const clinicalSummaryJson = JSON.stringify(clinicalSummaryObj);

    // Full payload with all target columns
    const fullPayload: Record<string, any> = {
      token,
      patient_name: patientName,
      age: 0,
      gender: "Emergency Casualty",
      phone: "EMERGENCY_SOS",
      specialty: "Emergency & Trauma Care",
      department: "Emergency & Trauma Care",
      appointment_date: "IMMEDIATE EMERGENCY DISPATCH",
      urgency_level: "CRITICAL_RED_ALERT",
      urgent: true,
      status: "Waiting",
      symptoms,
      summary: clinicalSummaryJson,
      clinical_summary: clinicalSummaryJson,
      created_at: nowIso,
    };

    let { data, error } = await supabase
      .from("appointments")
      .insert(fullPayload)
      .select()
      .single();

    // Fallback if some columns don't exist in Supabase table schema
    if (
      error &&
      (error.message?.includes("column") ||
        error.code === "PGRST204" ||
        error.code === "42703")
    ) {
      console.warn(
        "Retrying emergency insert with core columns due to missing column:",
        error.message
      );
      const corePayload: Record<string, any> = {
        token,
        patient_name: patientName,
        age: 0,
        gender: "Emergency Casualty",
        phone: "EMERGENCY_SOS",
        department: "Emergency & Trauma Care",
        appointment_date: "IMMEDIATE EMERGENCY DISPATCH",
        symptoms,
        summary: clinicalSummaryJson,
        urgent: true,
      };

      const fallbackRes = await supabase
        .from("appointments")
        .insert(corePayload)
        .select()
        .single();
      data = fallbackRes.data;
      error = fallbackRes.error;

      // If still error, try minimal payload
      if (
        error &&
        (error.message?.includes("column") ||
          error.code === "PGRST204" ||
          error.code === "42703")
      ) {
        const minimalPayload: Record<string, any> = {
          token,
          patient_name: patientName,
          department: "Emergency & Trauma Care",
          appointment_date: "IMMEDIATE EMERGENCY DISPATCH",
          symptoms,
          summary: clinicalSummaryJson,
          urgent: true,
        };
        const minimalRes = await supabase
          .from("appointments")
          .insert(minimalPayload)
          .select()
          .single();
        data = minimalRes.data;
        error = minimalRes.error;
      }
    }

    if (error) {
      console.error("Emergency Supabase Error:", error);
      return NextResponse.json(
        { error: "Emergency Supabase Error: " + error.message, details: error },
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
