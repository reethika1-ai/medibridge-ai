export interface BookingSmsPayload {
  phone: string;
  patientName: string;
  token: string;
  date: string;
  timeSlot: string;
  doctorName: string;
  paymentMode: "ONLINE" | "OFFLINE";
  amount?: number;
  earlyMobilization?: boolean;
}

/**
 * Dispatches simulated SMS confirmation for patient appointment booking
 * and triggers browser notifications if permission is granted.
 */
export async function dispatchBookingSms(payload: BookingSmsPayload) {
  const paymentDetails =
    payload.paymentMode === "ONLINE"
      ? "Mode: ONLINE (₹500 Paid - 75% refund policy if cancelled >3 hrs prior)."
      : "Mode: OFFLINE (₹500 payable at Hospital OPD Counter on arrival).";

  const message = `MediBridge AI Confirmation: Hello ${payload.patientName}, your token #${payload.token} is confirmed with ${payload.doctorName} on ${payload.date} at ${payload.timeSlot}. ${paymentDetails} IMPORTANT: Please arrive at the hospital 20 minutes prior to your slot (${payload.timeSlot}) for express triage check-in.`;

  console.log(`[SMS DISPATCHED to ${payload.phone}]:\n${message}`);

  // Browser desktop notification fallback for real-time delivery feel
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification("MediBridge SMS Delivered", {
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
 * Dispatches SMS notification for Early Queue Mobilization
 */
export async function dispatchEarlyMobilizationSms(
  phone: string,
  patientName: string,
  token: string,
  slot: string
) {
  const message = `⚡ MediBridge Early Queue Alert: Dear ${patientName} (Token #${token}), the attending physician is running ahead of schedule for your ${slot} slot. You are invited to arrive immediately for priority express consultation!`;

  console.log(`[EARLY MOBILIZATION SMS to ${phone}]:\n${message}`);

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

