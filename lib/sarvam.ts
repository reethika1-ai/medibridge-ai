export async function extractHandwrittenText(fileUrl: string): Promise<string> {
  return extractOcrFromUrl(fileUrl, "prescription.png");
}

async function fallbackToVisionTranscription(
  fileUrl: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GROK_API_KEY || "";
  if (!apiKey) return "";

  const visionPrompt =
    "Read this handwritten prescription image carefully and extract all medication names, strengths, dosages, frequency, and instructions. Output the list clearly.";

  const base64Data = `data:${mimeType || "image/png"};base64,${buffer.toString("base64")}`;
  const imageSourceUrl = fileUrl.startsWith("http") ? fileUrl : base64Data;

  // 1. If Groq API Key (starts with gsk_)
  if (apiKey.startsWith("gsk_")) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.2-11b-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: visionPrompt },
                { type: "image_url", image_url: { url: imageSourceUrl } },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });

      if (groqRes.ok) {
        const data = await groqRes.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (e) {
      console.warn("Groq vision fallback error:", e);
    }
  }

  // 2. If xAI Grok API Key
  if (!apiKey.startsWith("gsk_")) {
    try {
      const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-2-vision-1212",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: visionPrompt },
                { type: "image_url", image_url: { url: imageSourceUrl } },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });

      if (grokRes.ok) {
        const data = await grokRes.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (e) {
      console.warn("xAI vision fallback error:", e);
    }
  }

  return "";
}

export async function extractOcrFromUrl(
  fileUrl: string,
  filename = "document.png"
): Promise<string> {
  if (!fileUrl) return "";

  let buffer: Buffer | null = null;
  let mimeType = "image/png";

  try {
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) return "";

    const arrayBuffer = await fileResponse.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    mimeType = fileResponse.headers.get("content-type") || "image/png";
  } catch (err) {
    console.error("Failed to fetch file buffer from URL:", fileUrl, err);
    return "";
  }

  const apiKey = process.env.SARVAM_API_KEY || process.env.SARVAM_AI_API_KEY || "";
  let extractedText = "";

  // 1. Submit fetched buffer to Sarvam AI Document Digitization
  if (apiKey && buffer) {
    try {
      const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
      const formData = new FormData();
      formData.append("file", blob, filename);
      formData.append("language", "en-IN");
      formData.append("output_format", "md");

      const sarvamPromise = fetch("https://api.sarvam.ai/doc-ai/digitise", {
        method: "POST",
        headers: {
          "api-subscription-key": process.env.SARVAM_API_KEY || process.env.SARVAM_AI_API_KEY || "",
        },
        body: formData,
      });

      let response = await Promise.race([
        sarvamPromise,
        new Promise<Response | null>((resolve) => setTimeout(() => resolve(null), 4500)),
      ]);

      if (!response || !response.ok) {
        // Fallback to https://api.sarvam.ai/doc-ai/v1/ocr
        try {
          const formDataV1 = new FormData();
          formDataV1.append("file", blob, filename);
          formDataV1.append("language", "en-IN");
          const v1Promise = fetch("https://api.sarvam.ai/doc-ai/v1/ocr", {
            method: "POST",
            headers: {
              "api-subscription-key":
                process.env.SARVAM_API_KEY || process.env.SARVAM_AI_API_KEY || "",
            },
            body: formDataV1,
          });
          response = await Promise.race([
            v1Promise,
            new Promise<Response | null>((resolve) => setTimeout(() => resolve(null), 4000)),
          ]);
        } catch {
          // Continue to vision fallback
        }
      }

      if (response && response.ok) {
        const data = await response.json();
        extractedText =
          data.extracted_text ||
          data.markdown ||
          data.text ||
          (typeof data.data === "string" ? data.data : data.data?.extracted_text) ||
          "";
      }
    } catch (err) {
      console.warn("Sarvam AI OCR extraction error:", err);
    }
  }

  // 2. Automatic Grok Vision Fallback if Sarvam API fails, times out, or returns empty text
  if (!extractedText.trim() && buffer) {
    try {
      extractedText = await fallbackToVisionTranscription(fileUrl, buffer, mimeType);
    } catch (err) {
      console.warn("Vision transcription fallback error:", err);
    }
  }

  return extractedText.trim();
}

/**
 * Concurrently extracts OCR text from both prescription and report files
 * using Sarvam AI with automatic Grok Vision fallback.
 */
export async function extractPrescriptionAndReportOCR(
  prescriptionUrl?: string | null,
  reportUrl?: string | null,
  timeoutMs = 6000
): Promise<{ prescriptionText: string; reportText: string }> {
  const tasks: [Promise<string>, Promise<string>] = [
    prescriptionUrl
      ? extractOcrFromUrl(prescriptionUrl, "prescription.png")
      : Promise.resolve(""),
    reportUrl ? extractOcrFromUrl(reportUrl, "medical_report.png") : Promise.resolve(""),
  ];

  try {
    const results = await Promise.race([
      Promise.all(tasks),
      new Promise<[string, string]>((resolve) =>
        setTimeout(() => resolve(["", ""]), timeoutMs)
      ),
    ]);

    return {
      prescriptionText: results[0] || "",
      reportText: results[1] || "",
    };
  } catch {
    return { prescriptionText: "", reportText: "" };
  }
}
