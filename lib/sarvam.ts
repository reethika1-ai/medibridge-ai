export async function extractHandwrittenText(fileUrl: string): Promise<string> {
  return extractOcrFromUrl(fileUrl, "prescription.png");
}

export async function extractOcrFromUrl(
  fileUrl: string,
  filename = "document.png"
): Promise<string> {
  try {
    if (!fileUrl) return "";

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) return "";

    const blob = await fileResponse.blob();

    const formData = new FormData();
    formData.append("file", blob, filename);
    formData.append("language", "en-IN");
    formData.append("output_format", "md");

    const apiKey = process.env.SARVAM_AI_API_KEY || process.env.SARVAM_API_KEY || "";
    if (!apiKey) return "";

    // Primary Sarvam AI Document Digitization endpoint
    const response = await fetch("https://api.sarvam.ai/doc-ai/digitise", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return data.extracted_text || data.markdown || "";
    }

    // Graceful fallback to v1 job endpoint if standard route changes
    const fallbackResponse = await fetch("https://api.sarvam.ai/doc-ai/v1/job/digitise", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: formData,
    });

    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();
      return data.extracted_text || data.markdown || "";
    }

    return "";
  } catch (error) {
    console.error("Sarvam AI OCR extraction error:", error);
    return ""; // Silent fallback
  }
}

/**
 * Extracts OCR text from both prescription and report files concurrently
 * with a race condition safeguard so network delays never block the user.
 */
export async function extractPrescriptionAndReportOCR(
  prescriptionUrl?: string | null,
  reportUrl?: string | null,
  timeoutMs = 4500
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
