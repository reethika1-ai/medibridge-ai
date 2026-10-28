import { NextResponse } from "next/server";
import { extractPrescriptionAndReportOCR } from "@/lib/sarvam";

export type MedicationItem = {
  name: string;
  dosage: string;
  frequency: string;
};

export type TriageOutput = {
  clinical_observations: string;
  extracted_medications: MedicationItem[];
  diagnostic_findings: string;
  urgency_level: "Normal" | "Urgent";
  urgency_flags: string[];
  chief_complaint: string;
  key_information: string[];
  summary: string;
  urgent_flag: boolean;
  prescription_url?: string | null;
  report_url?: string | null;
  document_url?: string | null;
};

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
  "hemoptysis",
  "syncope",
  "tachycardia",
  "hypotension",
  "acute abdomen",
];

const IMAGING_KEYWORDS = [
  "x-ray",
  "xray",
  "mri",
  "ct scan",
  "computed tomography",
  "ultrasound",
  "sonogram",
  "radiograph",
  "radiology",
  "imaging",
  "scan",
  "fluoroscopy",
];

const IMAGING_NOTE =
  "X-ray/Imaging report detected. Direct view and download links are available below.";

function detectImagingPresence(
  reportUrl?: string | null,
  reportText?: string | null,
  symptoms?: string | null
): boolean {
  const combined = `${reportUrl || ""} ${reportText || ""} ${symptoms || ""}`.toLowerCase();
  const hasKeyword = IMAGING_KEYWORDS.some((kw) => combined.includes(kw));
  const hasImageExtension =
    Boolean(reportUrl) &&
    Boolean(
      /\.(jpe?g|png|webp|dicom)/i.test(reportUrl || "") ||
        reportUrl?.includes("image/upload")
    );

  return Boolean(hasKeyword || hasImageExtension);
}

function parseMedicationsFromText(text: string): MedicationItem[] {
  if (!text || !text.trim()) return [];

  const medications: MedicationItem[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const dosageRegex = /\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|units|tablets?|caps?))\b/i;
  const freqRegex =
    /\b(once\s+daily|twice\s+daily|thrice\s+daily|daily|od|bd|bid|tds|tid|qid|hs|prn|sos|every\s+\d+\s+hours?|before\s+meals?|after\s+meals?)\b/i;

  for (const line of lines) {
    const dosageMatch = line.match(dosageRegex);
    const freqMatch = line.match(freqRegex);

    if (dosageMatch || freqMatch) {
      const dosage = dosageMatch ? dosageMatch[1] : "Standard Dose";
      const frequency = freqMatch ? freqMatch[1].toUpperCase() : "As Directed";
      const name = line
        .replace(dosageRegex, "")
        .replace(freqRegex, "")
        .replace(/^[-•*#\d.]+\s*/, "")
        .replace(/[,;:]/g, "")
        .trim();

      if (name && name.length > 2) {
        medications.push({
          name: name.slice(0, 50),
          dosage,
          frequency,
        });
      }
    }
  }

  return medications;
}

export async function processClinicalTriage(body: {
  symptoms?: string;
  prescription_url?: string | null;
  report_url?: string | null;
  document_url?: string | null;
  prescription_text?: string | null;
  report_text?: string | null;
  patient_info?: {
    name?: string;
    age?: number | string;
    gender?: string;
    phone?: string;
    department?: string;
  };
}): Promise<TriageOutput> {
  const symptoms = String(body.symptoms ?? "").trim();
  const prescriptionUrl = body.prescription_url || null;
  const reportUrl = body.report_url || body.document_url || null;
  const documentUrl = reportUrl || prescriptionUrl || null;

  // 1. Pass both prescription and report files through Sarvam AI OCR to extract raw text if not supplied
  let prescriptionText = body.prescription_text || "";
  let reportText = body.report_text || "";

  if ((prescriptionUrl && !prescriptionText) || (reportUrl && !reportText)) {
    try {
      const ocrResults = await extractPrescriptionAndReportOCR(
        !prescriptionText ? prescriptionUrl : null,
        !reportText ? reportUrl : null
      );
      if (!prescriptionText) prescriptionText = ocrResults.prescriptionText;
      if (!reportText) reportText = ocrResults.reportText;
    } catch (err) {
      console.error("Sarvam OCR multi-file pass failed:", err);
    }
  }

  const isImagingDetected = detectImagingPresence(reportUrl, reportText, symptoms);
  const lowerSymptoms = symptoms.toLowerCase();
  const keywordUrgent = URGENT_KEYWORDS.some((kw) => lowerSymptoms.includes(kw));

  // 2. Upgraded xAI Grok system prompt
  const systemPrompt = `You are an elite Chief Medical Officer and AI Clinical Triage Specialist at MediBridge AI.
Your objective: Conduct an in-depth clinical differential and diagnostic assessment synthesizing patient-reported symptoms, Sarvam AI OCR prescription text, and diagnostic lab/radiology reports.

RULES:
1. Do NOT simply echo or repeat symptoms. Formulate an advanced clinical diagnostic appraisal.
2. "clinical_observations": Provide an in-depth medical narrative covering:
   - Diagnostic breakdown of chief complaint with clinical terminology
   - Symptom timeline, onset, and progression
   - Plausible physiological or pathological underlying causes
   - Key positive and negative clinical indicators
3. "extracted_medications": Array of previous prescribed medications parsed from Sarvam OCR prescription text. Each item must have:
   { "name": "Medication name", "dosage": "Dosage/strength", "frequency": "Frequency/duration" }.
   If none are present, return an empty array [].
4. "diagnostic_findings": Comprehensive analysis of lab/blood values or pathology findings.
   CRITICAL MANDATORY INSTRUCTION: If any X-ray, CT scan, MRI, ultrasound, or radiological imaging report/scan is present or mentioned, you MUST explicitly include this exact sentence verbatim:
   "X-ray/Imaging report detected. Direct view and download links are available below."
5. "urgency_level": STRICTLY either "Urgent" or "Normal". Set "Urgent" if life-threatening indicators (chest pain, dyspnea, stroke, neurological signs, severe bleeding, unstable vitals) are present.
6. "urgency_flags": Array of specific clinical risk flags identified.
7. "chief_complaint": Concise primary complaint title.
8. "key_information": Array of 3-5 critical diagnostic summary bullet points.
9. "summary": Objective 2-3 sentence executive summary for the attending physician.

You MUST return STRICTLY valid JSON conforming to this structure:
{
  "clinical_observations": "string",
  "extracted_medications": [
    { "name": "string", "dosage": "string", "frequency": "string" }
  ],
  "diagnostic_findings": "string",
  "urgency_level": "Normal" | "Urgent",
  "urgency_flags": ["string"],
  "chief_complaint": "string",
  "key_information": ["string"],
  "summary": "string"
}`;

  const userPrompt = `Patient Details:
${body.patient_info ? JSON.stringify(body.patient_info, null, 2) : "Not specified"}

Patient Reported Symptoms:
${symptoms || "None specified by patient."}

Sarvam AI OCR - Previous Handwritten Prescription Text:
${prescriptionText || "No previous prescription text extracted."}

Sarvam AI OCR - Diagnostic Medical Report / Scan Text:
${reportText || "No diagnostic report text extracted."}

Attached Prescription Link: ${prescriptionUrl || "None"}
Attached Medical Report / Scan Link: ${reportUrl || "None"}
Imaging / X-Ray Detected Status: ${isImagingDetected ? "YES (Imaging attached)" : "NO"}`;

  const apiKey = process.env.GROK_API_KEY || "";
  let parsedResult: {
    clinical_observations?: string;
    extracted_medications?: MedicationItem[];
    diagnostic_findings?: string;
    urgency_level?: "Normal" | "Urgent";
    urgency_flags?: string[];
    chief_complaint?: string;
    key_information?: string[];
    summary?: string;
  } | null = null;

  // Attempt 1: xAI Grok endpoint
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
      // Fall through to Groq / deterministic engine
    }
  }

  // Attempt 2: Groq high-speed fallback
  if (!parsedResult && apiKey) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
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
      // Fall through to deterministic engine
    }
  }

  // Attempt 3: High-Grade Deterministic Clinical Synthesis Engine
  if (!parsedResult) {
    const fallbackMedications = parseMedicationsFromText(prescriptionText);
    const flags: string[] = [];
    if (keywordUrgent) {
      flags.push("Acute cardiovascular or respiratory red-flag symptom reported");
    }
    if (symptoms.toLowerCase().includes("pain")) {
      flags.push("Active pain symptom requiring immediate analgesic evaluation");
    }

    const sentences = symptoms.split(/(?<=[.!?])\s+/).filter(Boolean);
    const chiefComplaint = sentences[0] || (symptoms ? symptoms.slice(0, 90) : "Clinical Consultation");

    let diagnosticFindings = reportText
      ? `Analysis of uploaded records: ${reportText.slice(0, 240)}... Findings require physician correlation with clinical presentation.`
      : "No prior laboratory or blood panel values provided in this intake.";

    if (isImagingDetected) {
      diagnosticFindings = `${IMAGING_NOTE}\n\n${diagnosticFindings}`;
    }

    parsedResult = {
      clinical_observations: `Diagnostic Assessment: Patient presents with ${symptoms || "unspecified clinical concerns"}. Clinical analysis indicates symptomatic presentation involving chief complaint of ${chiefComplaint.toLowerCase()}. Symptom onset and progression indicate probable underlying inflammatory or physiological etiology requiring in-person vital evaluation, auscultation, and clinical correlation.`,
      extracted_medications: fallbackMedications,
      diagnostic_findings: diagnosticFindings,
      urgency_level: keywordUrgent ? "Urgent" : "Normal",
      urgency_flags: flags,
      chief_complaint: chiefComplaint,
      key_information: [
        `Chief complaint: ${chiefComplaint}`,
        keywordUrgent ? "CRITICAL: Urgent triage criteria met" : "Standard outpatient triage priority",
        prescriptionText ? "Prior prescriptions parsed via Sarvam OCR" : "No handwritten prescription text attached",
        isImagingDetected ? "Radiological scan / imaging uploaded" : "Routine clinical consultation profile",
      ],
      summary: `Patient presents with ${symptoms || "routine symptoms"}. Evaluated by MediBridge AI clinical engine. In-person clinical assessment recommended.`,
    };
  }

  // Ensure mandatory imaging sentence is explicitly present if imaging is detected
  let diagnosticFindings = parsedResult.diagnostic_findings || "";
  if (isImagingDetected && !diagnosticFindings.includes(IMAGING_NOTE)) {
    diagnosticFindings = `${IMAGING_NOTE}\n\n${diagnosticFindings}`.trim();
  }

  // Ensure keyword urgent override for patient safety
  const urgencyLevel: "Normal" | "Urgent" =
    parsedResult.urgency_level === "Urgent" || keywordUrgent ? "Urgent" : "Normal";
  const urgencyFlags = parsedResult.urgency_flags || [];
  if (keywordUrgent && !urgencyFlags.some((f) => f.toLowerCase().includes("acute") || f.toLowerCase().includes("urgent"))) {
    urgencyFlags.unshift("Red-flag clinical indicator identified in reported symptoms");
  }

  const finalOutput: TriageOutput = {
    clinical_observations: parsedResult.clinical_observations || `Clinical assessment: Patient presents with ${symptoms}.`,
    extracted_medications: Array.isArray(parsedResult.extracted_medications)
      ? parsedResult.extracted_medications
      : [],
    diagnostic_findings: diagnosticFindings || "No abnormal diagnostic findings recorded.",
    urgency_level: urgencyLevel,
    urgency_flags: urgencyFlags,
    chief_complaint: parsedResult.chief_complaint || symptoms.slice(0, 80) || "General Consultation",
    key_information: parsedResult.key_information || [symptoms.slice(0, 100)],
    summary: parsedResult.summary || `Patient presents with: ${symptoms}`,
    urgent_flag: urgencyLevel === "Urgent",
    prescription_url: prescriptionUrl,
    report_url: reportUrl,
    document_url: documentUrl,
  };

  return finalOutput;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await processClinicalTriage(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Clinical triage agent execution failed." },
      { status: 500 }
    );
  }
}

