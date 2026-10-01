"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { Celula, Genero, Informe, Rol, Usuario } from "@/lib/types";

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const WHATSAPP_COUNTRY_CODE = "591";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith(WHATSAPP_COUNTRY_CODE)) return digits;
  return `${WHATSAPP_COUNTRY_CODE}${digits.replace(/^0+/, "")}`;
}

function mensajeRecordatorio(nombre: string, numerosCelula: string[]) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const celulaTexto =
    numerosCelula.length > 1
      ? `tus células N° ${numerosCelula.join(", ")}`
      : `tu célula N° ${numerosCelula[0]}`;
  return `Hola ${nombre}, te saluda el equipo de Primera Asamblea. Notamos que ${celulaTexto} todavía no envió el informe semanal. ¿Nos ayudas llenándolo aquí? ${origin}/informe/publico ¡Gracias por tu servicio!`;
}

const ROL_LABEL: Record<Rol, string> = {
  lider: "Líder de célula",
  lider_m12: "Líder M12",
  admin: "Administrador",
};

function slugify(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function generarPasswordTemporal(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

function CrearUsuarioForm({ onCreated }: { onCreated: () => void }) {
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Rol>("lider");
  const [genero, setGenero] = useState<Genero | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const esAdmin = rol === "admin";

  async function crearUsuario(token: string | undefined, usuarioIntento: string, passwordFinal: string) {
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        nombre,
        usuario: usuarioIntento,
        password: passwordFinal,
        rol,
        ...(genero ? { genero } : {}),
      }),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();

      if (esAdmin) {
        const { ok, data } = await crearUsuario(token, usuario, password);
        if (!ok) throw new Error(data.error || "Error al crear usuario.");
        setSuccess(`Administrador "${nombre}" creado correctamente.`);
      } else {
        const base = slugify(nombre) || `lider${Date.now()}`;
        const passwordGenerada = generarPasswordTemporal();
        let usuarioFinal = base;
        let intento = 0;
        let ultimoError: string | null = null;
        let creado = false;
        while (intento < 5 && !creado) {
          const { ok, data } = await crearUsuario(token, usuarioFinal, passwordGenerada);
          if (ok) {
            creado = true;
            break;
          }
          ultimoError = data.error || "Error al crear usuario.";
          if (!/already|existe|in use/i.test(ultimoError ?? "")) break;
          intento += 1;
          usuarioFinal = `${base}${intento + 1}`;
        }
        if (!creado) throw new Error(ultimoError || "Error al crear usuario.");
        setSuccess(`"${nombre}" creado correctamente (usuario interno: ${usuarioFinal}).`);
      }

      setNombre("");
      setUsuario("");
      setPassword("");
      setGenero("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">Nombre completo</span>
        <input
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">Rol</span>
        <select
          value={rol}
          onChange={(e) => setRol(e.target.value as Rol)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="lider">Líder de célula</option>
          <option value="lider_m12">Líder M12</option>
          <option value="admin">Administrador</option>
        </select>
      </label>
      {!esAdmin && (
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Género</span>
          <select
            required
            value={genero}
            onChange={(e) => setGenero(e.target.value as Genero)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Selecciona...</option>
            <option value="Mujeres">Mujeres</option>
            <option value="Varones">Varones</option>
          </select>
        </label>
      )}
      {esAdmin && (
        <>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Usuario o correo</span>
            <input
              type="text"
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="admin23 o admin@iglesia.org"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Contraseña</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
        </>
      )}
      <div className="sm:col-span-2 lg:col-span-4">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        {success && <p className="mb-2 text-sm text-green-600">{success}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Creando..." : "Crear usuario"}
        </button>
        {!esAdmin && (
          <p className="mt-2 text-xs text-slate-500">
            No necesita usuario ni contraseña: llena su informe desde el formulario público, sin
            iniciar sesión. Después de crearlo, asígnale una célula desde la sección{" "}
            <span className="font-medium">Células</span>.
          </p>
        )}
      </div>
    </form>
  );
}

function EditarUsuarioRow({
  usuario,
  lideresM12,
  onDone,
}: {
  usuario: Usuario;
  lideresM12: Usuario[];
  onDone: () => void;
}) {
  const [nombre, setNombre] = useState(usuario.nombre);
  const [rol, setRol] = useState<Rol>(usuario.rol);
  const [liderM12Id, setLiderM12Id] = useState(usuario.liderM12Id ?? "");
  const [celular, setCelular] = useState(usuario.celular ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(usuario.fechaNacimiento ?? "");
  const [genero, setGenero] = useState<Genero | "">(usuario.genero ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuardar() {
    setError(null);
    setSubmitting(true);
    try {
      const rolCambioAFueraDeLider = usuario.rol !== rol && rol !== "lider" && rol !== "lider_m12";
      await updateDoc(doc(db, "usuarios", usuario.uid), {
        nombre,
        rol,
        liderM12Id: rol === "lider" ? liderM12Id || null : usuario.liderM12Id ?? null,
        celular,
        fechaNacimiento,
        genero: genero || null,
        ...(rolCambioAFueraDeLider ? { celulaIds: deleteField() } : {}),
      });
      onDone();
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <tr className="border-t border-slate-100 bg-slate-50">
      <td className="px-4 py-2" colSpan={9}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Nombre</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Rol</span>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as Rol)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="lider">Líder de célula</option>
              <option value="lider_m12">Líder M12</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          {rol === "lider" && (
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Líder M12</span>
              <select
                value={liderM12Id}
                onChange={(e) => setLiderM12Id(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Sin asignar</option>
                {lideresM12.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Género</span>
            <select
              value={genero}
              onChange={(e) => setGenero(e.target.value as Genero)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Sin definir</option>
              <option value="Mujeres">Mujeres</option>
              <option value="Varones">Varones</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Número de celular</span>
            <input
              type="tel"
              placeholder="70012345"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Fecha de nacimiento</span>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              onClick={handleGuardar}
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={onDone}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {rol === "lider" && (
          <p className="mt-2 text-xs text-slate-500">
            La célula asignada se maneja desde la sección Células.
          </p>
        )}
      </td>
    </tr>
  );
}

function UsuariosContent() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [informesRecientes, setInformesRecientes] = useState<Informe[]>([]);
  const [loading, setLoading] = useState(true);
  const [editandoUid, setEditandoUid] = useState<string | null>(null);
  const [confirmandoUid, setConfirmandoUid] = useState<string | null>(null);
  const [borrandoUid, setBorrandoUid] = useState<string | null>(null);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "usuarios"), orderBy("nombre"));
    const unsub = onSnapshot(q, (snap) => {
      setUsuarios(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Usuario, "uid">) })));
      setLoading(false);
    });
    const unsubCelulas = onSnapshot(collection(db, "celulas"), (snap) => {
      setCelulas(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Celula, "id">) })));
    });
    const unsubInformes = onSnapshot(
      query(collection(db, "informes"), where("fecha", ">=", isoDaysAgo(7))),
      (snap) => {
        setInformesRecientes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Informe, "id">) })));
      }
    );
    return () => {
      unsub();
      unsubCelulas();
      unsubInformes();
    };
  }, []);

  const numeroPorCelulaId = new Map(celulas.map((c) => [c.id, c.numero]));
  const lideresM12 = usuarios.filter((u) => u.rol === "lider_m12");

  const celulasPorLider = useMemo(() => {
    const map = new Map<string, Celula[]>();
    for (const c of celulas) {
      if (!map.has(c.liderId)) map.set(c.liderId, []);
      map.get(c.liderId)!.push(c);
    }
    return map;
  }, [celulas]);

  const celulaIdsConInformeReciente = useMemo(
    () => new Set(informesRecientes.map((i) => i.celulaId)),
    [informesRecientes]
  );

  async function handleEliminar(u: Usuario) {
    setConfirmandoUid(null);
    setErrorBorrar(null);
    setBorrandoUid(u.uid);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: u.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar usuario.");
    } catch (err) {
      setErrorBorrar(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setBorrandoUid(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Usuarios y líderes</h1>
      <CrearUsuarioForm onCreated={() => {}} />

      <p className="text-sm text-slate-600">
        Completa el celular y la fecha de nacimiento de cada líder editando su fila. El botón de
        WhatsApp aparece para quienes tienen celular registrado y no enviaron el informe en los
        últimos 7 días.
      </p>

      {errorBorrar && <p className="text-sm text-red-600">{errorBorrar}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Rol</th>
                <th className="px-4 py-2 font-medium">Género</th>
                <th className="px-4 py-2 font-medium">Célula(s)</th>
                <th className="px-4 py-2 font-medium">Celular</th>
                <th className="px-4 py-2 font-medium">Fecha de nacimiento</th>
                <th className="px-4 py-2 font-medium">Informe (7 días)</th>
                <th className="px-4 py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                if (editandoUid === u.uid) {
                  return (
                    <EditarUsuarioRow
                      key={u.uid}
                      usuario={u}
                      lideresM12={lideresM12}
                      onDone={() => setEditandoUid(null)}
                    />
                  );
                }
                const misCelulas = celulasPorLider.get(u.uid) ?? [];
                const numeros = misCelulas.map((c) => c.numero);
                const reporto =
                  misCelulas.length === 0 ||
                  misCelulas.some((c) => celulaIdsConInformeReciente.has(c.id));
                return (
                  <tr key={u.uid} className="border-t border-slate-100">
                    <td className="px-4 py-2">{u.nombre}</td>
                    <td className="px-4 py-2">{ROL_LABEL[u.rol]}</td>
                    <td className="px-4 py-2">{u.genero || "—"}</td>
                    <td className="px-4 py-2">
                      {u.celulaIds && u.celulaIds.length > 0
                        ? u.celulaIds.map((id) => numeroPorCelulaId.get(id) ?? id).join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-2">{u.celular || "—"}</td>
                    <td className="px-4 py-2">{u.fechaNacimiento || "—"}</td>
                    <td className="px-4 py-2">
                      {misCelulas.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : reporto ? (
                        <span className="font-medium text-green-600">Al día</span>
                      ) : (
                        <span className="font-medium text-red-600">Pendiente</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {confirmandoUid === u.uid ? (
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-slate-600">
                            {(u.celulaIds?.length ?? 0) > 0
                              ? "Tiene célula(s). ¿Eliminar igual?"
                              : "¿Eliminar?"}
                          </span>
                          <button
                            onClick={() => handleEliminar(u)}
                            disabled={borrandoUid === u.uid}
                            className="font-medium text-red-600 hover:underline disabled:opacity-50"
                          >
                            {borrandoUid === u.uid ? "Eliminando..." : "Sí, eliminar"}
                          </button>
                          <button
                            onClick={() => setConfirmandoUid(null)}
                            className="text-slate-500 hover:underline"
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditandoUid(u.uid)}
                            className="mr-3 text-blue-600 hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setConfirmandoUid(u.uid)}
                            className="mr-3 text-red-600 hover:underline"
                          >
                            Eliminar
                          </button>
                          {!reporto &&
                            misCelulas.length > 0 &&
                            (u.celular ? (
                              <a
                                href={`https://wa.me/${normalizePhone(u.celular)}?text=${encodeURIComponent(
                                  mensajeRecordatorio(u.nombre, numeros)
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:underline"
                              >
                                Recordar por WhatsApp
                              </a>
                            ) : (
                              <span className="text-slate-400">Sin celular</span>
                            ))}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <ProtectedRoute allow={["admin"]}>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <UsuariosContent />
      </main>
    </ProtectedRoute>
  );
}
