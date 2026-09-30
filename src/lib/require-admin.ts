import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export async function requireAdmin(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const decoded = await getAdminAuth().verifyIdToken(token).catch(() => null);
  if (!decoded) return null;
  const callerSnap = await getAdminDb().doc(`usuarios/${decoded.uid}`).get();
  if (!callerSnap.exists || callerSnap.data()?.rol !== "admin") return null;
  return decoded.uid;
}
