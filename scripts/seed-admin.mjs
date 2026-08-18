// Crea el primer usuario administrador. Solo se necesita una vez, ya que
// dentro de la app únicamente un admin puede crear otros usuarios.
//
// Uso:
//   FIREBASE_SERVICE_ACCOUNT_JSON='<json de la cuenta de servicio>' \
//   node scripts/seed-admin.mjs correo@iglesia.org "contraseña" "Nombre Apellido"

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const [, , email, password, nombre] = process.argv;

if (!email || !password || !nombre) {
  console.error(
    'Uso: node scripts/seed-admin.mjs correo@iglesia.org "contraseña" "Nombre Apellido"'
  );
  process.exit(1);
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) {
  console.error("Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT_JSON.");
  process.exit(1);
}

const app = initializeApp({ credential: cert(JSON.parse(raw)) });
const auth = getAuth(app);
const db = getFirestore(app);

const userRecord = await auth.createUser({ email, password, displayName: nombre });
await db.doc(`usuarios/${userRecord.uid}`).set({
  nombre,
  email,
  rol: "admin",
  activo: true,
});

console.log(`Administrador creado: ${email} (uid: ${userRecord.uid})`);
