import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = body.password;
    const expectedPassword = process.env.DOCTOR_PASSWORD || "medibridge2026";

    if (!password || password !== expectedPassword) {
      return NextResponse.json({ error: "Invalid physician password." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, message: "Authenticated successfully" });

    response.cookies.set({
      name: "doctor_auth",
      value: "authenticated",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 28800, // 8 hours
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
  return response;
}
