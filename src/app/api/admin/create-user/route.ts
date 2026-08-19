import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { toAuthEmail } from "@/lib/auth-email";
import { Rol } from "@/lib/types";

interface CreateUserBody {
  nombre: string;
  usuario: string; // usuario corto (sin @) o correo real
  password: string;
  rol: Rol;
  liderM12Id?: string;
}

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const decoded = await getAdminAuth().verifyIdToken(token).catch(() => null);
  if (!decoded) return null;
  const callerSnap = await getAdminDb().doc(`usuarios/${decoded.uid}`).get();
  if (!callerSnap.exists || callerSnap.data()?.rol !== "admin") return null;
  return decoded.uid;
}

export async function POST(req: NextRequest) {
  const adminUid = await requireAdmin(req);
  if (!adminUid) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = (await req.json()) as CreateUserBody;
  const { nombre, usuario, password, rol, liderM12Id } = body;

  if (!nombre || !usuario || !password || !rol) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres." },
      { status: 400 }
    );
  }

  const email = toAuthEmail(usuario);

  try {
    const userRecord = await getAdminAuth().createUser({
      email,
      password,
      displayName: nombre,
    });

    await getAdminDb().doc(`usuarios/${userRecord.uid}`).set({
      nombre,
      email,
      rol,
      activo: true,
      ...(rol === "lider" ? { celulaIds: [], liderM12Id: liderM12Id ?? null } : {}),
    });

    return NextResponse.json({ uid: userRecord.uid });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
