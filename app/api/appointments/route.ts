import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculateConsultationEta } from "@/app/api/appointment/slot-availability/route";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    let query = supabase.from("appointments").select("*");

    if (token) {
      query = query.eq("token", token);
    } else {
      query = query
        .order("urgent", { ascending: false })
        .order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Normalize status, summary, and dual document URLs for all consumers
    const formattedData = (data || []).map((item) => {
      let parsedSummary: Record<string, any> | null = null;
      let status = "Waiting";

      if (item.summary) {
        try {
          parsedSummary = JSON.parse(item.summary);
          if (parsedSummary && typeof parsedSummary === "object" && parsedSummary.status) {
            status = parsedSummary.status;
          }
        } catch {
          // If summary is plain text, keep parsedSummary null
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

      return {
        ...item,
        status,
        parsed_summary: parsedSummary,
        prescription_url,
        report_url,
        document_url,
        age,
        gender,
        phone,
      };
    });

    let singleAppointment = formattedData[0] || null;
    if (token && singleAppointment) {
      try {
        const appointmentDateStr = singleAppointment.appointment_date || "";
        const parts = appointmentDateStr.split("@").map((s: string) => s.trim());
        const aptDate = parts[0] || "";
        const aptTime = parts[1] || "";

        if (aptDate && aptTime) {
          const { data: slotApts } = await supabase
            .from("appointments")
            .select("token, created_at, status")
            .like("appointment_date", `${aptDate} @ ${aptTime}%`)
            .order("created_at", { ascending: true });

          const activeApts = (slotApts || []).filter((a) => a.status !== "Cancelled");
          const index = activeApts.findIndex((a) => a.token === token);
          const position = index >= 0 ? index + 1 : 1;
          const slotTotal = Math.max(activeApts.length, position);

          singleAppointment = {
            ...singleAppointment,
            queue_position: position,
            slot_total: slotTotal,
            max_capacity: 8,
            consultation_eta: calculateConsultationEta(aptTime, position),
          };
        }
      } catch (calcErr) {
        console.warn("Could not calculate queue position in /api/appointments:", calcErr);
      }
    }

    return NextResponse.json({
      ok: true,
      data: formattedData,
      appointments: formattedData,
      appointment: singleAppointment,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.token || !body.patient_name || !body.department || !body.appointment_date) {
      return NextResponse.json(
        { error: "Missing required fields (token, patient_name, department, appointment_date)" },
        { status: 400 }
      );
    }

    // Prepare unified summary object containing clinical triage and document links
    let summaryObj: Record<string, any> = {};
    if (body.summary) {
      if (typeof body.summary === "object") {
        summaryObj = { ...body.summary };
      } else {
        try {
          summaryObj = JSON.parse(body.summary);
        } catch {
          summaryObj = { summary: body.summary };
        }
      }
    }

    summaryObj.status = body.status || summaryObj.status || "Waiting";
    if (body.prescription_url) summaryObj.prescription_url = body.prescription_url;
    if (body.report_url) summaryObj.report_url = body.report_url;
    if (body.document_url) summaryObj.document_url = body.document_url;
    if (body.age !== undefined) summaryObj.age = body.age;
    if (body.gender !== undefined) summaryObj.gender = body.gender;
    if (body.phone !== undefined) summaryObj.phone = body.phone;

    const summaryPayload = JSON.stringify(summaryObj);

    // Attempt insert with extra fields, falling back to core schema if columns are not present in Supabase table
    const fullPayload: Record<string, any> = {
      token: body.token,
      patient_name: body.patient_name,
      department: body.department,
      appointment_date: body.appointment_date,
      symptoms: body.symptoms ?? null,
      summary: summaryPayload,
      urgent: body.urgent ?? false,
      report_public_id: body.report_public_id ?? null,
    };

    if (body.prescription_url !== undefined) fullPayload.prescription_url = body.prescription_url;
    if (body.report_url !== undefined) fullPayload.report_url = body.report_url;
    if (body.document_url !== undefined) fullPayload.document_url = body.document_url;
    if (body.age !== undefined) fullPayload.age = body.age;
    if (body.gender !== undefined) fullPayload.gender = body.gender;
    if (body.phone !== undefined) fullPayload.phone = body.phone;

    let { data, error } = await supabase.from("appointments").insert(fullPayload).select().single();

    if (error && (error.message.includes("column") || error.code === "PGRST204" || error.code === "42703")) {
      const corePayload = {
        token: body.token,
        patient_name: body.patient_name,
        department: body.department,
        appointment_date: body.appointment_date,
        symptoms: body.symptoms ?? null,
        summary: summaryPayload,
        urgent: body.urgent ?? false,
        report_public_id: body.report_public_id ?? null,
      };
      const fallbackRes = await supabase.from("appointments").insert(corePayload).select().single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...data,
        prescription_url: body.prescription_url || summaryObj.prescription_url,
        report_url: body.report_url || summaryObj.report_url,
        document_url: body.document_url || summaryObj.document_url,
        age: body.age ?? summaryObj.age,
        gender: body.gender ?? summaryObj.gender,
        phone: body.phone ?? summaryObj.phone,
        parsed_summary: summaryObj,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save appointment" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const token = body.token;

    if (!token) {
      return NextResponse.json({ error: "Token is required to update an appointment" }, { status: 400 });
    }

    // Fetch current appointment to merge summary safely
    const { data: existing } = await supabase
      .from("appointments")
      .select("*")
      .eq("token", token)
      .single();

    let summaryObj: Record<string, any> = {};
    if (existing?.summary) {
      try {
        summaryObj = JSON.parse(existing.summary);
      } catch {
        summaryObj = { summary: existing.summary };
      }
    }

    if (body.summary) {
      if (typeof body.summary === "object") {
        summaryObj = { ...summaryObj, ...body.summary };
      } else {
        try {
          summaryObj = { ...summaryObj, ...JSON.parse(body.summary) };
        } catch {
          summaryObj.summary = body.summary;
        }
      }
    }

    if (body.status !== undefined) {
      summaryObj.status = body.status;
    } else if (!summaryObj.status) {
      summaryObj.status = "Waiting";
    }

    if (body.prescription_url) summaryObj.prescription_url = body.prescription_url;
    if (body.report_url) summaryObj.report_url = body.report_url;
    if (body.document_url) summaryObj.document_url = body.document_url;
    if (body.age !== undefined) summaryObj.age = body.age;
    if (body.gender !== undefined) summaryObj.gender = body.gender;
    if (body.phone !== undefined) summaryObj.phone = body.phone;

    const updatePayload: Record<string, any> = {
      summary: JSON.stringify(summaryObj),
    };

    if (body.symptoms !== undefined) updatePayload.symptoms = body.symptoms;
    if (body.urgent !== undefined) updatePayload.urgent = Boolean(body.urgent);
    if (body.report_public_id !== undefined) updatePayload.report_public_id = body.report_public_id;
    if (body.prescription_url !== undefined) updatePayload.prescription_url = body.prescription_url;
    if (body.report_url !== undefined) updatePayload.report_url = body.report_url;
    if (body.document_url !== undefined) updatePayload.document_url = body.document_url;
    if (body.age !== undefined) updatePayload.age = body.age;
    if (body.gender !== undefined) updatePayload.gender = body.gender;
    if (body.phone !== undefined) updatePayload.phone = body.phone;

    let { data, error } = await supabase
      .from("appointments")
      .update(updatePayload)
      .eq("token", token)
      .select()
      .single();

    if (error && (error.message.includes("column") || error.code === "PGRST204" || error.code === "42703")) {
      const coreUpdate: Record<string, any> = {
        summary: JSON.stringify(summaryObj),
      };
      if (body.symptoms !== undefined) coreUpdate.symptoms = body.symptoms;
      if (body.urgent !== undefined) coreUpdate.urgent = Boolean(body.urgent);
      if (body.report_public_id !== undefined) coreUpdate.report_public_id = body.report_public_id;

      const fallbackRes = await supabase
        .from("appointments")
        .update(coreUpdate)
        .eq("token", token)
        .select()
        .single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...data,
        prescription_url: body.prescription_url || summaryObj.prescription_url,
        report_url: body.report_url || summaryObj.report_url,
        document_url: body.document_url || summaryObj.document_url,
        age: body.age ?? summaryObj.age,
        gender: body.gender ?? summaryObj.gender,
        phone: body.phone ?? summaryObj.phone,
        parsed_summary: summaryObj,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update appointment" },
      { status: 500 }
    );
  }
}
