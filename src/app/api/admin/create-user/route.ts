
// app/api/admin/create-user/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

async function assertAdmin(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) throw new Error("missing-id-token");

  const app = getAdminApp();
  const adminAuth = getAdminAuth(app);
  const decoded = await adminAuth.verifyIdToken(token, true);

  // Política: verifica en Firestore si el usuario tiene rol Administrador
  const db = getFirestore(app);
  const snap = await db.collection("users").doc(decoded.uid).get();
  if (!snap.exists || snap.get("role") !== "Administrador") {
    throw new Error("forbidden-not-admin");
  }
  return decoded.uid;
}

export async function POST(request: Request) {
  try {
    await assertAdmin(request);

    const body = await request.json();
    const { name, email, password, role, avatar } = body || {};
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "missing-fields" }, { status: 400 });
    }

    const app = getAdminApp();
    const adminAuth = getAdminAuth(app);
    const db = getFirestore(app);

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      photoURL: avatar || undefined,
      emailVerified: false,
      disabled: false,
    });

    // Crea doc en Firestore
    await db.collection("users").doc(userRecord.uid).set({
      id: userRecord.uid,
      uid: userRecord.uid,
      name,
      email,
      role,
      avatar: avatar || "https://placehold.co/100x100.png",
      createdAt: new Date(),
    });

    return NextResponse.json({ uid: userRecord.uid }, { status: 200 });
  } catch (err: any) {
    let status = 500;
    let msg = "Unknown error";

    if (err.message === "missing-id-token") {
      status = 401;
      msg = "Missing Authorization Bearer token.";
    } else if (err.message === "forbidden-not-admin") {
      status = 403;
      msg = "User is not an Administrator.";
    } else if (
      /FIREBASE_ADMIN_B64/i.test(err.message) ||
      /private key/i.test(err.message) ||
      /PEM/i.test(err.message)
    ) {
      status = 500;
      msg =
        "Server-side Firebase Admin credentials are not formatted correctly. Check FIREBASE_ADMIN_B64 (JSON base64) or FB_PRIVATE_KEY.";
    } else if (err.errorInfo?.message) {
      msg = err.errorInfo.message;
    } else if (err.message) {
      msg = err.message;
    }

    return NextResponse.json({ error: msg }, { status });
  }
}
