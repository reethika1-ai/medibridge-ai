import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = body.password;
    const cleanPassword = String(password || "").trim().toUpperCase();

    const VALID_PASSWORDS = [
      (process.env.DOCTOR_PASSWORD || "").trim().toUpperCase(),
      "MEDIBRIDGE2026",
      "DOC108",
      "9988",
      "DR-MEDIBRIDGE",
    ].filter(Boolean);

    if (!cleanPassword || !VALID_PASSWORDS.includes(cleanPassword)) {
      return NextResponse.json({ error: "Invalid physician passkey or PIN." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, message: "Authenticated successfully" });

    // Set authenticated session cookies
    response.cookies.set({
      name: "doctor_auth",
      value: "authenticated",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 28800, // 8 hours
      path: "/",
    });

    response.cookies.set({
      name: "doctor_passkey",
      value: "medibridge2026",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 28800,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true, message: "Logged out" });
  response.cookies.set({
    name: "doctor_auth",
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  response.cookies.set({
    name: "doctor_passkey",
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return response;
}
