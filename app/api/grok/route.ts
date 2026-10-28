import { NextResponse } from "next/server";
import { processClinicalTriage } from "@/app/api/triage/route";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await processClinicalTriage(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "xAI Grok agent triage failed." },
      { status: 500 }
    );
  }
}

