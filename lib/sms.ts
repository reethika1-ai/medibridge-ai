export interface BookingSmsPayload {
  phone: string;
  patientName: string;
  token: string;
  date: string;
  timeSlot: string;
  doctorName: string;
  paymentMode?: "ONLINE" | "OFFLINE";
  amount?: number;
  queueSpot?: number | string;
  earlyMobilization?: boolean;
}

export interface BookingConfirmationParams {
  phone: string;
  patientName: string;
  token: string;
  doctorName: string;
  date: string;
  timeSlot: string;
  queueSpot: number | string;
}

/**
 * Dispatches production booking confirmation SMS with 20-minute advance arrival notice via Fast2SMS
 */
export async function sendBookingConfirmationSms({
  phone,
  patientName,
  token,
  doctorName,
  date,
  timeSlot,
  queueSpot,
}: BookingConfirmationParams) {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const message = `MediBridge AI Confirmation: Hello ${patientName}, your consultation token #${token} is CONFIRMED with ${doctorName} on ${date} at ${timeSlot}. Queue Spot: #${queueSpot}. IMPORTANT: Please arrive at the hospital 20 minutes prior to your scheduled time slot for express triage check-in.`;

  console.log(`[SMS DISPATCHED to ${cleanPhone}]:\n${message}`);

  // Server context: direct Fast2SMS dispatch
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;
  if (fast2SmsKey) {
    try {
      await fetch("https://www.fast2sms.com/dev/bulkV2", {
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
    } catch (err) {
      console.error("Fast2SMS API direct dispatch error:", err);
    }
  } else if (typeof window !== "undefined") {
    // Client browser context: route through secure backend endpoint
    try {
      await fetch("/api/sms/confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          patientName,
          token,
          doctorName,
          date,
          timeSlot,
          queueSpot,
        }),
      });
    } catch (err) {
      console.warn("Client SMS confirmation route error:", err);
    }
  }

  // Browser desktop notification fallback for immediate user feedback
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification("MediBridge Booking Confirmed", {
        body: message,
        icon: "/favicon.ico",
      });
    } catch {
      // Ignore notification display failures
    }
  }

  return { success: true, message, dispatchedAt: new Date().toISOString() };
}

/**
 * Backward-compatible dispatch helper for booking flows
 */
export async function dispatchBookingSms(payload: BookingSmsPayload) {
  return sendBookingConfirmationSms({
    phone: payload.phone,
    patientName: payload.patientName,
    token: payload.token,
    doctorName: payload.doctorName,
    date: payload.date,
    timeSlot: payload.timeSlot,
    queueSpot: payload.queueSpot || 1,
  });
}

/**
 * Dispatches SMS notification for Early Queue Mobilization
 */
export async function dispatchEarlyMobilizationSms(
  phone: string,
  patientName: string,
  token: string,
  slot: string
) {
  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const message = `⚡ MediBridge Early Queue Alert: Dear ${patientName} (Token #${token}), the attending physician is running ahead of schedule for your ${slot} slot. You are invited to arrive immediately for priority express consultation!`;

  console.log(`[EARLY MOBILIZATION SMS to ${cleanPhone}]:\n${message}`);

  const fast2SmsKey = process.env.FAST2SMS_API_KEY;
  if (fast2SmsKey) {
    try {
      await fetch("https://www.fast2sms.com/dev/bulkV2", {
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
    } catch (err) {
      console.error("Fast2SMS Early Mobilization dispatch error:", err);
    }
  }

  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification("⚡ MediBridge Early Call Alert", {
        body: message,
        icon: "/favicon.ico",
      });
    } catch {
      // Ignore
    }
  }

  return { success: true, message };
}
