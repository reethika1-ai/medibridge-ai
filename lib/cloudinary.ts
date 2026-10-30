/**
 * Cloudinary Medical Intelligence & Transformation Pipeline
 * MediBridge AI Clinical Vault
 *
 * Implements 4 Core Medical Document Capabilities:
 * 1. Image Pre-processing for Enhanced Sarvam AI OCR (Sharpening & Contrast Normalization)
 * 2. Dynamic DICOM High-Contrast & Radiographic Inversion for Scans/X-Rays
 * 3. Semi-transparent HIPAA Medical Confidentiality Watermarking
 * 4. Automatic Multi-Page PDF Lab Report Rasterization into Instant High-Res Thumbnails
 */

/**
 * Injects Cloudinary transformation string into a standard Cloudinary asset URL.
 */
function injectCloudinaryTransformation(url: string, transformation: string): string {
  if (!url || typeof url !== "string") return url;

  // Check if standard Cloudinary delivery URL
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) {
    return url;
  }

  // Handle existing transformations: res.cloudinary.com/<cloud>/image/upload/<transformations>/<version>/<public_id>
  const parts = url.split("/image/upload/");
  if (parts.length === 2) {
    return `${parts[0]}/image/upload/${transformation}/${parts[1]}`;
  }

  return url;
}

/**
 * 1. Pre-processes prescription images before Sarvam OCR
 * Enhances handwriting strokes, removes background discoloration, and sharpens ink lines.
 */
export function getOcrPreprocessedUrl(url: string | null | undefined): string {
  if (!url) return "";
  // Cloudinary transformations:
  // e_sharpen:120: Sharpens ink handwriting edges
  // e_contrast:25: Deepens ink contrast against paper
  // e_auto_color: Neutralizes yellowish ambient lighting or shadows
  // q_auto:best: Preserves maximal resolution for character recognition
  return injectCloudinaryTransformation(url, "e_sharpen:120,e_contrast:25,e_auto_color,q_auto:best");
}

/**
 * 2. Dynamic DICOM High-Contrast Inversion Filter for X-Rays and Scans
 * Enhances bone margins, lung parenchyma, and radiodense foreign bodies.
 */
export function getDicomHighContrastUrl(url: string | null | undefined): string {
  if (!url) return "";
  // Cloudinary transformations for radiographic clarity:
  // e_grayscale: Converts color scans to pure monochromatic DICOM scale
  // e_contrast:80: High dynamic range contrast for bone/soft tissue discrimination
  // e_sharpen:150: Enhances cortical margins and fine hairline fissures
  return injectCloudinaryTransformation(url, "e_grayscale,e_contrast:80,e_sharpen:150,q_auto");
}

/**
 * Inverted DICOM Negative Filter (Bone White on Black vs Black on White)
 */
export function getDicomNegativeUrl(url: string | null | undefined): string {
  if (!url) return "";
  return injectCloudinaryTransformation(url, "e_negate,e_grayscale,e_contrast:90,e_sharpen:120");
}

/**
 * 3. HIPAA Medical Confidentiality Watermark
 * Stamps legal confidentiality overlay across medical records for secure audit compliance.
 */
export function getHipaaWatermarkedUrl(url: string | null | undefined): string {
  if (!url) return "";
  // Text overlay: CONFIDENTIAL MEDICAL RECORD - HIPAA PROTECTED
  const watermarkText = encodeURIComponent("CONFIDENTIAL MEDICAL RECORD - HIPAA PROTECTED");
  const watermarkTransform = `l_text:Arial_22_bold:${watermarkText},co_rgb:ffffff,o_30,g_south,y_25`;
  return injectCloudinaryTransformation(url, watermarkTransform);
}

/**
 * 4. Rasterizes PDF Lab Reports into Instant High-Res Thumbnails
 * Generates instant page-1 PNG/JPG previews without requiring PDF plugins or downloads.
 */
export function getPdfThumbnailUrl(url: string | null | undefined): string {
  if (!url) return "";

  // If the file is a PDF in Cloudinary, convert to page 1 PNG/JPG
  if (url.toLowerCase().endsWith(".pdf") || url.includes("/raw/upload/") || url.includes("/image/upload/")) {
    let rasterUrl = url.replace(/\.pdf$/i, ".png");
    // If resource type was raw, Cloudinary handles PDF rasterization under image/upload
    rasterUrl = rasterUrl.replace("/raw/upload/", "/image/upload/");
    return injectCloudinaryTransformation(rasterUrl, "pg_1,w_600,c_scale,q_auto");
  }

  return url;
}

/**
 * Returns complete medical pipeline transformations for a given medical asset.
 */
export function getMedicalPipelineBundle(url: string | null | undefined, docType?: string) {
  if (!url) {
    return {
      original: null,
      ocr_preprocessed: null,
      dicom_high_contrast: null,
      dicom_inverted: null,
      hipaa_watermarked: null,
      thumbnail: null,
    };
  }

  const isPdf = url.toLowerCase().endsWith(".pdf");
  const isScan = docType === "report" || url.includes("report") || url.includes("scan");

  return {
    original: url,
    ocr_preprocessed: getOcrPreprocessedUrl(url),
    dicom_high_contrast: isScan ? getDicomHighContrastUrl(url) : null,
    dicom_inverted: isScan ? getDicomNegativeUrl(url) : null,
    hipaa_watermarked: getHipaaWatermarkedUrl(url),
    thumbnail: isPdf ? getPdfThumbnailUrl(url) : url,
  };
}

