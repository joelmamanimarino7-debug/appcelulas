"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { Celula, Usuario } from "@/lib/types";

function CrearCelulaForm({
  lideresDisponibles,
  lideresM12,
  onCreated,
}: {
  lideresDisponibles: Usuario[];
  lideresM12: Usuario[];
  onCreated: () => void;
}) {
  const [numero, setNumero] = useState("");
  const [nombre, setNombre] = useState("");
  const [liderId, setLiderId] = useState("");
  const [liderM12Id, setLiderM12Id] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!liderId || !liderM12Id) {
      setError("Selecciona un líder y un líder M12.");
      return;
    }
    setSubmitting(true);
    try {
      const lider = lideresDisponibles.find((u) => u.uid === liderId)!;
      const liderM12 = lideresM12.find((u) => u.uid === liderM12Id)!;

      const celulaRef = doc(collection(db, "celulas"));
      const batch = writeBatch(db);
      batch.set(celulaRef, {
        numero,
        nombre: nombre || null,
        liderId,
        liderNombre: lider.nombre,
        liderM12Id,
        liderM12Nombre: liderM12.nombre,
        activa: true,
      });
      batch.update(doc(db, "usuarios", liderId), {
        celulaId: celulaRef.id,
        liderM12Id,
      });
      await batch.commit();

      setNumero("");
      setNombre("");
      setLiderId("");
      setLiderM12Id("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la célula.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <label className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">Líder</span>
        <select
          required
          value={liderId}
          onChange={(e) => setLiderId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Selecciona...</option>
          {lideresDisponibles.map((u) => (
            <option key={u.uid} value={u.uid}>
              {u.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-slate-700">Líder M12</span>
        <select
          required
          value={liderM12Id}
          onChange={(e) => setLiderM12Id(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Selecciona...</option>
          {lideresM12.map((u) => (
            <option key={u.uid} value={u.uid}>
              {u.nombre}
            </option>
          ))}
        </select>
      </label>
      <div className="sm:col-span-2 lg:col-span-4">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Creando..." : "Crear célula"}
        </button>
        {lideresDisponibles.length === 0 && (
          <p className="mt-2 text-xs text-amber-600">
            No hay líderes disponibles sin célula asignada. Crea uno primero en{" "}
            <span className="font-medium">Usuarios</span>.
          </p>
        )}
      </div>
    </form>
  );
}

function CelulasContent() {
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCelulas = onSnapshot(query(collection(db, "celulas"), orderBy("numero")), (snap) => {
      setCelulas(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Celula, "id">) })));
      setLoading(false);
    });
    const unsubUsuarios = onSnapshot(collection(db, "usuarios"), (snap) => {
      setUsuarios(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<Usuario, "uid">) })));
    });
    return () => {
      unsubCelulas();
      unsubUsuarios();
    };
  }, []);

  const lideresDisponibles = usuarios.filter((u) => u.rol === "lider" && !u.celulaId);
  const lideresM12 = usuarios.filter((u) => u.rol === "lider_m12");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Células</h1>
      <CrearCelulaForm
        lideresDisponibles={lideresDisponibles}
        lideresM12={lideresM12}
        onCreated={() => {}}
      />

      {loading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">N°</th>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Líder</th>
                <th className="px-4 py-2 font-medium">Líder M12</th>
              </tr>
            </thead>
            <tbody>
              {celulas.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{c.numero}</td>
                  <td className="px-4 py-2">{c.nombre ?? "—"}</td>
                  <td className="px-4 py-2">{c.liderNombre}</td>
                  <td className="px-4 py-2">{c.liderM12Nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CelulasPage() {
  return (
    <ProtectedRoute allow={["admin"]}>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <CelulasContent />
      </main>
    </ProtectedRoute>
  );
}
