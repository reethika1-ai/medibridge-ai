import { NextResponse } from "next/server";

// Access the shared in-memory OTP storage
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
    const submittedOtp = String(body.otp ?? "").trim();
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);

    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number." },
        { status: 400 }
      );
    }

    if (!submittedOtp || submittedOtp.length !== 6) {
      return NextResponse.json(
        { success: false, error: "Please enter the complete 6-digit OTP." },
        { status: 400 }
      );
    }

    const otpStore = getOtpStore();
    const record = otpStore.get(cleanPhone);

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired OTP. Please request a new code." },
        { status: 400 }
      );
    }

    // Check expiration
    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanPhone);
      return NextResponse.json(
        { success: false, error: "OTP has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Validate OTP match
    if (record.otp !== submittedOtp) {
      return NextResponse.json(
        { success: false, error: "Incorrect verification code. Please check and try again." },
        { status: 400 }
      );
    }

    // On match: Invalidate used OTP immediately
    otpStore.delete(cleanPhone);

    return NextResponse.json({
      success: true,
      verified: true,
      message: "Mobile phone successfully verified.",
    });
  } catch (error: any) {
    console.error("Verify OTP endpoint error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "OTP verification failed." },
      { status: 500 }
    );
  }
}

