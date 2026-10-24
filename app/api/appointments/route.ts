import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    // Normalize status and summary for frontend consumers
    const formattedData = (data || []).map((item) => {
      let parsedSummary = null;
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

      return {
        ...item,
        status,
        parsed_summary: parsedSummary,
      };
    });

    return NextResponse.json({ ok: true, data: formattedData });
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

    let initialSummary = body.summary ?? null;
    if (initialSummary && typeof initialSummary === "object") {
      initialSummary = JSON.stringify({ ...initialSummary, status: body.status || "Waiting" });
    }

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        token: body.token,
        patient_name: body.patient_name,
        department: body.department,
        appointment_date: body.appointment_date,
        symptoms: body.symptoms ?? null,
        summary: initialSummary,
        urgent: body.urgent ?? false,
        report_public_id: body.report_public_id ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
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

    const updatePayload: Record<string, unknown> = {};

    if (body.symptoms !== undefined) {
      updatePayload.symptoms = body.symptoms;
    }
    if (body.urgent !== undefined) {
      updatePayload.urgent = Boolean(body.urgent);
    }
    if (body.report_public_id !== undefined) {
      updatePayload.report_public_id = body.report_public_id;
    }

    // Check if status or summary needs update
    if (body.status !== undefined || body.summary !== undefined) {
      // Fetch current summary if we are only changing status or merging
      let summaryObj: Record<string, unknown> = {};
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
      } else {
        const { data: existing } = await supabase
          .from("appointments")
          .select("summary")
          .eq("token", token)
          .single();

        if (existing?.summary) {
          try {
            summaryObj = JSON.parse(existing.summary);
          } catch {
            summaryObj = { summary: existing.summary };
          }
        }
      }

      if (body.status !== undefined) {
        summaryObj.status = body.status;
      } else if (!summaryObj.status) {
        summaryObj.status = "Waiting";
      }

      updatePayload.summary = JSON.stringify(summaryObj);
    }

    const { data, error } = await supabase
      .from("appointments")
      .update(updatePayload)
      .eq("token", token)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update appointment" },
      { status: 500 }
    );
  }
}