// app/api/_diag/admin-cred/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export async function GET() {
  try {
    const app = getAdminApp();
    // una llamada simple para validar que Admin arrancó
    await getAuth(app).listUsers(1);
    return NextResponse.json({ ok: true, message: "Admin OK" });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "unknown" },
      { status: 500 }
    );
  }
}
