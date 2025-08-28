// app/api/_diag/admin-cred/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    // una llamada simple para validar que Admin arrancó
    await getAdminAuth().listUsers(1);
    return NextResponse.json({ ok: true, message: "Admin OK" });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "unknown" },
      { status: 500 }
    );
  }
}
