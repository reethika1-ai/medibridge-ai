import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const MAX_SLOT_CAPACITY = 8;

/**
 * Calculates deterministic consultation ETA given a time slot string and 1-based queue rank.
 * e.g., slot "10:00 AM", position 3 -> ~10:15 AM
 */
export function calculateConsultationEta(slotTime: string, position: number): string {
  try {
    const match = slotTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return slotTime;

    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const meridian = match[3].toUpperCase();

    if (meridian === "PM" && hour < 12) hour += 12;
    if (meridian === "AM" && hour === 12) hour = 0;

    // 8 patients per 60 minutes = 7.5 mins per patient
    const minutesToAdd = Math.round((Math.max(1, position) - 1) * 7.5);

    const totalMinutes = hour * 60 + minute + minutesToAdd;
    let endHour = Math.floor(totalMinutes / 60) % 24;
    const endMinute = totalMinutes % 60;
    const endMeridian = endHour >= 12 ? "PM" : "AM";
    if (endHour > 12) endHour -= 12;
    if (endHour === 0) endHour = 12;

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(endHour)}:${pad(endMinute)} ${endMeridian}`;
  } catch {
    return slotTime;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const token = searchParams.get("token");

    // Case 1: Token provided -> Look up patient's slot, queue position, and ETA
    if (token) {
      const { data: appointment, error: aptError } = await supabase
        .from("appointments")
        .select("*")
        .eq("token", token)
        .single();

      if (aptError || !appointment) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
      }

      const appointmentDateStr = appointment.appointment_date || "";
      const parts = appointmentDateStr.split("@").map((s: string) => s.trim());
      const aptDate = parts[0] || "";
      const aptTime = parts[1] || "";

      if (!aptDate || !aptTime) {
        return NextResponse.json({
          ok: true,
          token,
          queue_position: 1,
          slot_total: 1,
          max_capacity: MAX_SLOT_CAPACITY,
          consultation_eta: "Scheduled Time",
        });
      }

      // Query all appointments for this exact slot
      const { data: slotApts, error: slotError } = await supabase
        .from("appointments")
        .select("token, created_at, status")
        .like("appointment_date", `${aptDate} @ ${aptTime}%`)
        .order("created_at", { ascending: true });

      if (slotError) {
        return NextResponse.json({ error: slotError.message }, { status: 500 });
      }

      // Filter out cancelled
      const activeApts = (slotApts || []).filter((a) => a.status !== "Cancelled");
      const index = activeApts.findIndex((a) => a.token === token);
      const position = index >= 0 ? index + 1 : 1;
      const slotTotal = Math.max(activeApts.length, position);
      const eta = calculateConsultationEta(aptTime, position);

      return NextResponse.json({
        ok: true,
        token,
        date: aptDate,
        time: aptTime,
        queue_position: position,
        slot_total: slotTotal,
        max_capacity: MAX_SLOT_CAPACITY,
        consultation_eta: eta,
      });
    }

    // Case 2: Date provided -> Get slot capacities for booking form
    if (!date) {
      return NextResponse.json({ error: "Date or token parameter is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("appointments")
      .select("appointment_date, token, status, created_at")
      .like("appointment_date", `${date}%`);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const slotCounts: Record<string, number> = {};

    (data || []).forEach((apt) => {
      if (apt.status === "Cancelled") return;
      const parts = (apt.appointment_date || "").split("@");
      const timeSlot = parts.length > 1 ? parts[1].trim() : "";
      if (timeSlot) {
        slotCounts[timeSlot] = (slotCounts[timeSlot] || 0) + 1;
      }
    });

    return NextResponse.json({
      ok: true,
      date,
      max_capacity: MAX_SLOT_CAPACITY,
      slot_counts: slotCounts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process slot availability" },
      { status: 500 }
    );
  }
}

