"use client";

import { useEffect, useState, FormEvent } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
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

function UsuariosContent() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Usuarios</h1>
      <CrearUsuarioForm onCreated={() => {}} />

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
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.uid} className="border-t border-slate-100">
                  <td className="px-4 py-2">{u.nombre}</td>
                  <td className="px-4 py-2">{displayUsuario(u.email)}</td>
                  <td className="px-4 py-2">{ROL_LABEL[u.rol]}</td>
                  <td className="px-4 py-2">
                    {u.celulaId ? (numeroPorCelulaId.get(u.celulaId) ?? u.celulaId) : "—"}
                  </td>
                </tr>
              ))}
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
