import { NextResponse } from "next/server";
import { processClinicalTriage } from "@/app/api/triage/route";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const symptoms = String(body.symptoms ?? "").trim();

    if (!symptoms) {
      return NextResponse.json(
        { error: "Symptoms description is required to generate a clinical summary." },
        { status: 400 }
      );
    }

    const triageResult = await processClinicalTriage({
      symptoms,
      prescription_url: body.prescription_url || null,
      report_url: body.report_url || body.document_url || null,
      prescription_text: body.prescription_text || null,
      report_text: body.report_text || null,
      patient_info: body.patient_info,
    });

    return NextResponse.json({
      ok: true,
      ...triageResult,
      raw_summary: `${triageResult.chief_complaint}\n\nClinical Observations:\n${triageResult.clinical_observations}\n\nKey Findings:\n${triageResult.key_information.map((k) => `• ${k}`).join("\n")}\n\nSummary:\n${triageResult.summary}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal summary error." },
      { status: 500 }
    );
  }
}
