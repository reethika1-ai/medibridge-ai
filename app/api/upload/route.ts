import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { extractHandwrittenText } from "@/lib/sarvam";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid upload request format." }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file was attached in the request." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload a PDF, JPG, or PNG report." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 10MB limit. Please upload a smaller document." },
        { status: 400 }
      );
    }

    const token =
      String(formData.get("token") ?? "")
        .replace(/[^A-Za-z0-9-_]/g, "")
        .slice(0, 32) || "MB-PATIENT";

    // Convert file to Buffer and then base64 Data URI
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = `data:${file.type};base64,${buffer.toString("base64")}`;

    const uploadResponse = await cloudinary.uploader.upload(base64Data, {
      folder: "medibridge_reports",
      public_id: `${token}-${Date.now().toString().slice(-6)}`,
      resource_type: "auto",
    });

    // Silently extract handwritten prescription text in the background via Sarvam AI
    let extractedText = "";
    try {
      // Allow up to 3.5s for fast OCR response without holding up the user's upload flow
      extractedText = await Promise.race([
        extractHandwrittenText(uploadResponse.secure_url),
        new Promise<string>((resolve) => setTimeout(() => resolve(""), 3500)),
      ]);
    } catch {
      // Silent fallback per strict no-disruption rule
      extractedText = "";
    }

    return NextResponse.json({
      ok: true,
      public_id: uploadResponse.public_id,
      secure_url: uploadResponse.secure_url,
      url: uploadResponse.secure_url,
      bytes: uploadResponse.bytes,
      format: uploadResponse.format,
      extracted_text: extractedText,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cloudinary upload failed." },
      { status: 500 }
    );
  }
}