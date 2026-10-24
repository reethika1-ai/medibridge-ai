export async function extractHandwrittenText(fileUrl: string): Promise<string> {
  try {
    if (!fileUrl) return "";

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) return "";

    const blob = await fileResponse.blob();

    const formData = new FormData();
    formData.append("file", blob, "prescription.png");
    formData.append("language", "en-IN");
    formData.append("output_format", "md");

    const apiKey = process.env.SARVAM_AI_API_KEY || process.env.SARVAM_API_KEY || "";
    if (!apiKey) return "";

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
    console.error("Sarvam AI API background extraction error:", error);
    return ""; // Silent fallback
  }
}
