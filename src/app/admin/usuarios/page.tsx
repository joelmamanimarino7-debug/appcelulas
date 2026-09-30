"use client";

import { useEffect, useState, FormEvent } from "react";
import { collection, deleteField, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { Celula, Rol, Usuario } from "@/lib/types";
import { AUTH_EMAIL_SUFFIX } from "@/lib/auth-email";

function displayUsuario(email: string) {
  return email.endsWith(`@${AUTH_EMAIL_SUFFIX}`)
    ? email.slice(0, -(AUTH_EMAIL_SUFFIX.length + 1))
    : email;
}

const ROL_LABEL: Record<Rol, string> = {
  lider: "Líder de célula",
  lider_m12: "Líder M12",
  admin: "Administrador",
};

function CrearUsuarioForm({ onCreated }: { onCreated: () => void }) {
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Rol>("lider");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre, usuario, password, rol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear usuario.");
      setSuccess(`Usuario "${nombre}" creado correctamente.`);
      setNombre("");
      setUsuario("");
      setPassword("");
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
        <span className="mb-1 block font-medium text-slate-700">Usuario o correo</span>
        <input
          type="text"
          required
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          placeholder="lider23 o lider@iglesia.org"
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
        {rol === "lider" && (
          <p className="mt-2 text-xs text-slate-500">
            Después de crear el líder, asígnale una célula desde la sección{" "}
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
      <td className="px-4 py-2" colSpan={5}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
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
    return () => {
      unsub();
      unsubCelulas();
    };
  }, []);

  const numeroPorCelulaId = new Map(celulas.map((c) => [c.id, c.numero]));
  const lideresM12 = usuarios.filter((u) => u.rol === "lider_m12");

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
      <h1 className="text-xl font-semibold text-slate-900">Usuarios</h1>
      <CrearUsuarioForm onCreated={() => {}} />

      {errorBorrar && <p className="text-sm text-red-600">{errorBorrar}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Usuario / correo</th>
                <th className="px-4 py-2 font-medium">Rol</th>
                <th className="px-4 py-2 font-medium">Célula</th>
                <th className="px-4 py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) =>
                editandoUid === u.uid ? (
                  <EditarUsuarioRow
                    key={u.uid}
                    usuario={u}
                    lideresM12={lideresM12}
                    onDone={() => setEditandoUid(null)}
                  />
                ) : (
                  <tr key={u.uid} className="border-t border-slate-100">
                    <td className="px-4 py-2">{u.nombre}</td>
                    <td className="px-4 py-2">{displayUsuario(u.email)}</td>
                    <td className="px-4 py-2">{ROL_LABEL[u.rol]}</td>
                    <td className="px-4 py-2">
                      {u.celulaIds && u.celulaIds.length > 0
                        ? u.celulaIds.map((id) => numeroPorCelulaId.get(id) ?? id).join(", ")
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
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
                            className="text-red-600 hover:underline"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              )}
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <UsuariosContent />
      </main>
    </ProtectedRoute>
  );
}
