"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import {
  arrayUnion,
  collection,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { Informe } from "@/lib/types";

function LiderDashboard() {
  const { usuario } = useAuth();
  const celulaIds = usuario?.celulaIds ?? [];
  const [informes, setInformes] = useState<Informe[]>([]);
  const [loading, setLoading] = useState(() => celulaIds.length > 0);

  useEffect(() => {
    if (celulaIds.length === 0) return;
    const q = query(
      collection(db, "informes"),
      where("celulaId", "in", celulaIds),
      orderBy("fecha", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setInformes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Informe, "id">) })));
      setLoading(false);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- celulaIds es un array nuevo en cada render; comparamos por contenido vía join
  }, [celulaIds.join(",")]);

  if (celulaIds.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Tu cuenta todavía no tiene una célula asignada. Pide al
        administrador que te asigne una.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Mis informes</h1>
        <Link
          href="/informe/nuevo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo informe
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : informes.length === 0 ? (
        <p className="text-sm text-slate-500">
          Todavía no has llenado ningún informe de célula.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Fecha</th>
                {celulaIds.length > 1 && <th className="px-4 py-2 font-medium">Célula</th>}
                <th className="px-4 py-2 font-medium">Asistencia</th>
                <th className="px-4 py-2 font-medium">Ofrenda Bs.</th>
                <th className="px-4 py-2 font-medium">Visitas</th>
              </tr>
            </thead>
            <tbody>
              {informes.map((inf) => (
                <tr key={inf.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <Link href={`/informe/${inf.id}`} className="text-blue-600 hover:underline">
                      {inf.fecha}
                    </Link>
                  </td>
                  {celulaIds.length > 1 && (
                    <td className="px-4 py-2">N° {inf.celulaNumero}</td>
                  )}
                  <td className="px-4 py-2">{inf.totalPresentes}</td>
                  <td className="px-4 py-2">{inf.ofrendaBs}</td>
                  <td className="px-4 py-2">
                    {inf.visitas.filter((v) => v.trim()).length}
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

function AbrirCelulaPropia() {
  const { usuario } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [numero, setNumero] = useState("");
  const [nombre, setNombre] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!usuario) return;
    setError(null);
    setSubmitting(true);
    try {
      const ref = await addDoc(collection(db, "celulas"), {
        numero,
        nombre: nombre || null,
        liderId: usuario.uid,
        liderNombre: usuario.nombre,
        liderM12Id: usuario.uid,
        liderM12Nombre: usuario.nombre,
        activa: true,
      });
      await updateDoc(doc(db, "usuarios", usuario.uid), {
        celulaIds: arrayUnion(ref.id),
      });
      setSuccess(`Célula N° ${numero} creada. Ya la puedes ver en "Mis informes".`);
      setNumero("");
      setNombre("");
      setAbierto(false);
    } catch {
      setError("No se pudo crear la célula. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!abierto) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => {
            setAbierto(true);
            setSuccess(null);
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          + Abrir nueva célula bajo mi liderazgo
        </button>
        {success && <p className="text-sm text-green-600">{success}</p>}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3"
    >
      <label className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">Número de célula</span>
        <input
          required
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">Nombre (opcional)</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </label>
      <div className="flex items-end gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Creando..." : "Crear célula"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="sm:col-span-3 text-sm text-red-600">{error}</p>}
    </form>
  );
}

function OtrosRolesInicio() {
  const { usuario } = useAuth();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">
        Bienvenido/a, {usuario?.nombre}
      </h1>
      <p className="text-sm text-slate-600">
        Tu rol es {usuario?.rol === "admin" ? "administrador" : "líder M12"}. Puedes
        ver el consolidado de informes de las células en el{" "}
        <Link href="/panel" className="text-blue-600 hover:underline">
          panel consolidado
        </Link>
        .
      </p>
      {usuario?.rol === "lider_m12" && <AbrirCelulaPropia />}
    </div>
  );
}

export default function DashboardPage() {
  const { usuario } = useAuth();
  const isSupervisor = usuario?.rol === "admin" || usuario?.rol === "lider_m12";
  const tieneCelulas = (usuario?.celulaIds?.length ?? 0) > 0;

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-8">
        {isSupervisor && <OtrosRolesInicio />}
        {(usuario?.rol === "lider" || tieneCelulas) && <LiderDashboard />}
      </main>
    </ProtectedRoute>
  );
}
