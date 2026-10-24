import { NextResponse } from "next/server";

const URGENT_KEYWORDS = [
  "chest pain",
  "difficulty breathing",
  "can't breathe",
  "cannot breathe",
  "shortness of breath",
  "severe bleeding",
  "unconscious",
  "fainted",
  "seizure",
  "stroke",
  "suicidal",
  "overdose",
  "anaphylaxis",
  "head injury",
  "vision loss",
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const symptoms = String(body.symptoms ?? "").trim();
    const reportMetadata = body.report_metadata ?? body.report_name ?? null;

    if (!symptoms) {
      return NextResponse.json(
        { error: "Symptoms description is required to generate a clinical summary." },
        { status: 400 }
      );
    }

    const lowerSymptoms = symptoms.toLowerCase();
    const keywordUrgent = URGENT_KEYWORDS.some((kw) => lowerSymptoms.includes(kw));

    const apiKey = process.env.GROK_API_KEY || "";
    const systemPrompt = `You are an expert clinical triage assistant for doctors at MediBridge AI.
Your objective: synthesize patient-reported symptoms and optional medical reports into a concise, accurate clinical intake summary.
Rules:
1. Extract the main problem into a concise "chief_complaint".
2. Extract critical clinical findings (duration, progression, severity, key signs) into "key_information" as an array of strings.
3. Write an objective, professional "summary" (2-3 sentences) suitable for a physician.
4. Set "urgent_flag" to true if there are life-threatening or red-flag signs (e.g. chest pain, shortness of breath, neuro deficit, severe hemorrhage), otherwise false.
5. You MUST return ONLY valid JSON matching this exact structure:
{
  "chief_complaint": "string",
  "key_information": ["string", "string"],
  "summary": "string",
  "urgent_flag": boolean
}`;

    const userPrompt = `Patient Symptoms:\n${symptoms}\n${
      reportMetadata ? `Attached Report Info: ${JSON.stringify(reportMetadata)}\n` : ""
    }`;

    let parsedResult: {
      chief_complaint: string;
      key_information: string[];
      summary: string;
      urgent_flag: boolean;
    } | null = null;

    // 1. Attempt xAI Grok endpoint first
    if (apiKey && !apiKey.startsWith("gsk_")) {
      try {
        const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "grok-2-latest",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.1,
            response_format: { type: "json_object" },
          }),
        });

        if (grokRes.ok) {
          const grokData = await grokRes.json();
          const content = grokData.choices?.[0]?.message?.content;
          if (content) {
            parsedResult = JSON.parse(content);
          }
        }
      } catch {
        // Fall back below
      }
    }

    // 2. Seamless fallback to Groq if key is gsk_ or xAI did not fulfill
    if (!parsedResult && apiKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.1,
            response_format: { type: "json_object" },
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const content = groqData.choices?.[0]?.message?.content;
          if (content) {
            parsedResult = JSON.parse(content);
          }
        }
      } catch {
        // Fall back to rule-based synthesis
      }
    }

    // 3. Fallback deterministic clinical synthesis if LLM is unreachable
    if (!parsedResult) {
      const sentences = symptoms.split(/(?<=[.!?])\s+/).filter(Boolean);
      parsedResult = {
        chief_complaint: sentences[0] || symptoms.slice(0, 80),
        key_information: [
          `Reported symptoms: ${symptoms}`,
          reportMetadata ? `Document attached: ${reportMetadata}` : "No initial report file",
          keywordUrgent ? "Potential red-flag criteria identified" : "Routine consultation profile",
        ],
        summary: `Patient presents with: ${symptoms}. Clinical assessment recommended upon consultation.`,
        urgent_flag: keywordUrgent,
      };
    }

    // Always enforce keyword urgent safety override
    if (keywordUrgent) {
      parsedResult.urgent_flag = true;
    }

    return NextResponse.json({
      ok: true,
      chief_complaint: parsedResult.chief_complaint,
      key_information: parsedResult.key_information,
      summary: parsedResult.summary,
      urgent_flag: parsedResult.urgent_flag,
      // Also provide combined summary string for backward compatibility
      raw_summary: `${parsedResult.chief_complaint}\n\nKey Findings:\n${parsedResult.key_information.map((k) => `• ${k}`).join("\n")}\n\nSummary:\n${parsedResult.summary}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal summary error." },
      { status: 500 }
    );
  }
}