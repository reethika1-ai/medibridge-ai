import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, patientName, token, doctorName, date, timeSlot, queueSpot } = body;

    const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json({ success: false, error: "Invalid phone number." }, { status: 400 });
    }

    const message = `MediBridge AI Confirmation: Hello ${patientName}, your consultation token #${token} is CONFIRMED with ${doctorName} on ${date} at ${timeSlot}. Queue Spot: #${queueSpot}. IMPORTANT: Please arrive at the hospital 20 minutes prior to your scheduled time slot for express triage check-in.`;

    const fast2SmsKey = process.env.FAST2SMS_API_KEY;
    if (fast2SmsKey) {
      try {
        const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            authorization: fast2SmsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            route: "q",
            message: message,
            numbers: cleanPhone,
          }),
        });

        const smsData = await smsRes.json().catch(() => ({}));
        console.log(`[Fast2SMS Confirmation to ${cleanPhone}]:`, smsData);
      } catch (smsErr) {
        console.error("Fast2SMS API dispatch error:", smsErr);
      }
    }

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (err: any) {
    console.error("Confirmation SMS route error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

