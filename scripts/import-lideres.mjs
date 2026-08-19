// Importación masiva de líderes M12 y líderes de célula desde un CSV.
// Crea las cuentas en Firebase Auth + Firestore, crea las células y las
// vincula. Es seguro volver a ejecutarlo (no duplica cuentas ni células ya
// creadas), útil si el CSV tenía errores y hay que corregir y reintentar.
//
// Columnas del CSV (encabezados exactos, en cualquier orden):
//   nombre        - obligatorio
//   rol           - obligatorio: "lider_m12" o "lider"
//   usuario       - login corto si no tiene correo (ej. "lider23")
//   email         - correo real, si lo tiene (usar uno de los dos: usuario o email)
//   telefono      - opcional
//   password      - opcional, si se deja vacío se genera una temporal
//   numeroCelula  - obligatorio si rol=lider
//   nombreCelula  - opcional, solo si rol=lider
//   liderM12      - obligatorio si rol=lider: debe coincidir con el "usuario"
//                   o "email" de la fila correspondiente con rol=lider_m12
//
// Uso:
//   FIREBASE_SERVICE_ACCOUNT_JSON='<json de la cuenta de servicio>' \
//   node scripts/import-lideres.mjs ruta/a/lideres.csv

import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { parse } from "csv-parse/sync";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Debe coincidir con NEXT_PUBLIC_AUTH_EMAIL_SUFFIX de .env.local, para que
// los usuarios sin correo propio puedan loguearse con el mismo dominio.
const AUTH_EMAIL_SUFFIX = process.env.NEXT_PUBLIC_AUTH_EMAIL_SUFFIX || "primeraasamblea.app";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Uso: node scripts/import-lideres.mjs ruta/a/lideres.csv");
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

function toAuthEmail(usuarioOCorreo) {
  const value = usuarioOCorreo.trim();
  return value.includes("@") ? value : `${value}@${AUTH_EMAIL_SUFFIX}`;
}

function generarPassword() {
  return randomBytes(6).toString("base64url"); // ej. "aB3-xQ9k"
}

function claveFila(row) {
  // Si tiene correo real, ese es el identificador de login; si no, el usuario corto.
  return (row.email?.trim() || row.usuario?.trim() || "").toLowerCase();
}

async function crearOEncontrarUsuario({ nombre, email, password, rol }) {
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    return { uid: userRecord.uid, creado: false };
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
  }
  userRecord = await auth.createUser({ email, password, displayName: nombre });
  await db.doc(`usuarios/${userRecord.uid}`).set(
    { nombre, email, rol, activo: true, ...(rol === "lider" ? { celulaIds: [] } : {}) },
    { merge: true }
  );
  return { uid: userRecord.uid, creado: true };
}

async function main() {
  const csvContent = readFileSync(csvPath, "utf-8");
  const rows = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

  const credencialesGeneradas = [];
  const erroresFila = [];

  const lideresM12Rows = rows.filter((r) => r.rol === "lider_m12");
  const liderRows = rows.filter((r) => r.rol === "lider");

  const otrosRoles = rows.filter((r) => r.rol !== "lider_m12" && r.rol !== "lider");
  if (otrosRoles.length > 0) {
    console.warn(
      `Aviso: ${otrosRoles.length} fila(s) con "rol" distinto de lider_m12/lider fueron ignoradas.`
    );
  }

  // 1. Líderes M12
  const m12PorClave = new Map(); // clave -> { uid, nombre }
  for (const row of lideresM12Rows) {
    const clave = claveFila(row);
    if (!row.nombre || !clave) {
      erroresFila.push(`Líder M12 sin nombre o sin usuario/email: ${JSON.stringify(row)}`);
      continue;
    }
    const email = toAuthEmail(clave);
    const password = row.password?.trim() || generarPassword();
    try {
      const { uid, creado } = await crearOEncontrarUsuario({
        nombre: row.nombre,
        email,
        password,
        rol: "lider_m12",
      });
      m12PorClave.set(clave, { uid, nombre: row.nombre });
      if (creado) {
        credencialesGeneradas.push({ nombre: row.nombre, rol: "lider_m12", usuario: email, password });
        console.log(`Líder M12 creado: ${row.nombre} (${email})`);
      } else {
        console.log(`Líder M12 ya existía: ${row.nombre} (${email})`);
      }
    } catch (err) {
      erroresFila.push(`Error creando líder M12 "${row.nombre}": ${err.message}`);
    }
  }

  // 2. Líderes de célula + su célula
  for (const row of liderRows) {
    const clave = claveFila(row);
    if (!row.nombre || !clave || !row.numeroCelula) {
      erroresFila.push(`Líder sin nombre/usuario/numeroCelula: ${JSON.stringify(row)}`);
      continue;
    }
    const liderM12Clave = (row.liderM12 || "").trim().toLowerCase();
    const liderM12 = m12PorClave.get(liderM12Clave);
    if (!liderM12) {
      erroresFila.push(
        `Líder "${row.nombre}": no se encontró el líder M12 "${row.liderM12}" (revisa que coincida con su usuario/email).`
      );
      continue;
    }

    const email = toAuthEmail(clave);
    const password = row.password?.trim() || generarPassword();

    try {
      const { uid: liderId, creado } = await crearOEncontrarUsuario({
        nombre: row.nombre,
        email,
        password,
        rol: "lider",
      });
      if (creado) {
        credencialesGeneradas.push({ nombre: row.nombre, rol: "lider", usuario: email, password });
        console.log(`Líder creado: ${row.nombre} (${email})`);
      } else {
        console.log(`Líder ya existía: ${row.nombre} (${email})`);
      }

      // Buscar célula existente por número, o crearla.
      const celulasExistentes = await db
        .collection("celulas")
        .where("numero", "==", row.numeroCelula)
        .limit(1)
        .get();

      const celulaData = {
        numero: row.numeroCelula,
        nombre: row.nombreCelula || null,
        liderId,
        liderNombre: row.nombre,
        liderM12Id: liderM12.uid,
        liderM12Nombre: liderM12.nombre,
        activa: true,
      };

      let celulaId;
      if (celulasExistentes.empty) {
        const ref = await db.collection("celulas").add(celulaData);
        celulaId = ref.id;
        console.log(`Célula creada: N° ${row.numeroCelula} (líder: ${row.nombre})`);
      } else {
        celulaId = celulasExistentes.docs[0].id;
        await db.doc(`celulas/${celulaId}`).set(celulaData, { merge: true });
        console.log(`Célula actualizada: N° ${row.numeroCelula} (líder: ${row.nombre})`);
      }

      await db.doc(`usuarios/${liderId}`).set(
        { celulaIds: FieldValue.arrayUnion(celulaId), liderM12Id: liderM12.uid },
        { merge: true }
      );
    } catch (err) {
      erroresFila.push(`Error procesando líder "${row.nombre}": ${err.message}`);
    }
  }

  if (credencialesGeneradas.length > 0) {
    const outPath = `credenciales-generadas-${Date.now()}.csv`;
    const csvOut = [
      "nombre,rol,usuario,password",
      ...credencialesGeneradas.map(
        (c) => `"${c.nombre}",${c.rol},${c.usuario},${c.password}`
      ),
    ].join("\n");
    writeFileSync(outPath, csvOut, "utf-8");
    console.log(
      `\n${credencialesGeneradas.length} cuenta(s) nueva(s). Credenciales guardadas en: ${outPath}`
    );
    console.log("Compártelas de forma segura con cada líder y bórralas después.");
  }

  if (erroresFila.length > 0) {
    console.log(`\n${erroresFila.length} fila(s) con errores:`);
    for (const e of erroresFila) console.log(`  - ${e}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
