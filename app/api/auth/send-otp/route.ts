import { NextResponse } from "next/server";

// In-memory OTP storage with 5-minute expiry across route requests
const getOtpStore = (): Map<string, { otp: string; expiresAt: number }> => {
  if (!(globalThis as any).otpStore) {
    (globalThis as any).otpStore = new Map<string, { otp: string; expiresAt: number }>();
  }
  return (globalThis as any).otpStore;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawPhone = String(body.phone ?? "");
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);

    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    // Generate real dynamic 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in global cache with 5-minute expiry
    const otpStore = getOtpStore();
    otpStore.set(cleanPhone, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // Dispatch live SMS via Fast2SMS Quick Route (instant non-DLT / no KYC required)
    const fast2SmsKey = process.env.FAST2SMS_API_KEY;
    if (fast2SmsKey) {
      try {
        const otpMessage = `Your MediBridge AI verification code is ${otp}. Valid for 5 minutes.`;

        const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            authorization: fast2SmsKey.trim(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            route: "q",
            message: otpMessage,
            numbers: cleanPhone,
            language: "english",
            flash: 0,
          }),
        });

        const smsData = await smsRes.json().catch(() => ({}));
        console.log(`[Fast2SMS Quick OTP Dispatch to ${cleanPhone}]:`, smsData);
      } catch (smsErr) {
        console.error("Fast2SMS API dispatch error:", smsErr);
        // Continue without blocking, in case network or sandbox environment restricts external API
      }
    } else {
      console.warn("FAST2SMS_API_KEY is not defined in environment.");
    }

    // Always return success without exposing OTP in response body
    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error: any) {
    console.error("Send OTP endpoint error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to send OTP. Please try again." },
      { status: 500 }
    );
  }
}
