import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/require-admin";

interface DeleteUserBody {
  uid: string;
}

export async function POST(req: NextRequest) {
  const adminUid = await requireAdmin(req);
  if (!adminUid) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = (await req.json()) as DeleteUserBody;
  const { uid } = body;

  if (!uid) {
    return NextResponse.json({ error: "Falta el uid del usuario." }, { status: 400 });
  }
  if (uid === adminUid) {
    return NextResponse.json(
      { error: "No puedes eliminar tu propia cuenta." },
      { status: 400 }
    );
  }

  try {
    await getAdminAuth().deleteUser(uid).catch((err) => {
      // Si ya no existe en Auth, igual borramos el documento de Firestore.
      if (err.code !== "auth/user-not-found") throw err;
    });
    await getAdminDb().doc(`usuarios/${uid}`).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
