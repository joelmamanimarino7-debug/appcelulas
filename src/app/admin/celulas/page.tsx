"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
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
        celulaIds: arrayUnion(celulaRef.id),
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
            Todavía no hay líderes creados. Crea uno primero en{" "}
            <span className="font-medium">Usuarios</span>.
          </p>
        )}
      </div>
    </form>
  );
}

function EditarCelulaRow({
  celula,
  lideresDisponibles,
  lideresM12,
  onDone,
}: {
  celula: Celula;
  lideresDisponibles: Usuario[];
  lideresM12: Usuario[];
  onDone: () => void;
}) {
  const [numero, setNumero] = useState(celula.numero);
  const [nombre, setNombre] = useState(celula.nombre ?? "");
  const [liderId, setLiderId] = useState(celula.liderId);
  const [liderM12Id, setLiderM12Id] = useState(celula.liderM12Id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuardar() {
    setError(null);
    if (!liderId || !liderM12Id) {
      setError("Selecciona un líder y un líder M12.");
      return;
    }
    setSubmitting(true);
    try {
      const lider = lideresDisponibles.find((u) => u.uid === liderId)!;
      const liderM12 = lideresM12.find((u) => u.uid === liderM12Id)!;

      const batch = writeBatch(db);
      batch.update(doc(db, "celulas", celula.id), {
        numero,
        nombre: nombre || null,
        liderId,
        liderNombre: lider.nombre,
        liderM12Id,
        liderM12Nombre: liderM12.nombre,
      });

      if (liderId !== celula.liderId) {
        batch.update(doc(db, "usuarios", celula.liderId), {
          celulaIds: arrayRemove(celula.id),
        });
        batch.update(doc(db, "usuarios", liderId), {
          celulaIds: arrayUnion(celula.id),
          liderM12Id,
        });
      } else if (liderM12Id !== celula.liderM12Id) {
        batch.update(doc(db, "usuarios", liderId), { liderM12Id });
      }

      await batch.commit();
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">N°</span>
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Nombre</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Líder</span>
            <select
              value={liderId}
              onChange={(e) => setLiderId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
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
              value={liderM12Id}
              onChange={(e) => setLiderM12Id(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {lideresM12.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.nombre}
                </option>
              ))}
            </select>
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
      </td>
    </tr>
  );
}

function CelulasContent() {
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);

  useEffect(() => {
    const unsubCelulas = onSnapshot(collection(db, "celulas"), (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Celula, "id">) }));
      lista.sort((a, b) => Number(a.numero) - Number(b.numero));
      setCelulas(lista);
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

  const lideresDisponibles = usuarios.filter((u) => u.rol === "lider" || u.rol === "lider_m12");
  const lideresM12 = usuarios.filter((u) => u.rol === "lider_m12");

  async function handleEliminar(c: Celula) {
    setConfirmandoId(null);
    setErrorBorrar(null);
    setBorrandoId(c.id);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "celulas", c.id));
      batch.update(doc(db, "usuarios", c.liderId), {
        celulaIds: arrayRemove(c.id),
      });
      await batch.commit();
    } catch (err) {
      setErrorBorrar(err instanceof Error ? err.message : "Error al eliminar la célula.");
    } finally {
      setBorrandoId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Células</h1>
      <CrearCelulaForm
        lideresDisponibles={lideresDisponibles}
        lideresM12={lideresM12}
        onCreated={() => {}}
      />

      {errorBorrar && <p className="text-sm text-red-600">{errorBorrar}</p>}

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
                <th className="px-4 py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {celulas.map((c) =>
                editandoId === c.id ? (
                  <EditarCelulaRow
                    key={c.id}
                    celula={c}
                    lideresDisponibles={lideresDisponibles}
                    lideresM12={lideresM12}
                    onDone={() => setEditandoId(null)}
                  />
                ) : (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{c.numero}</td>
                    <td className="px-4 py-2">{c.nombre ?? "—"}</td>
                    <td className="px-4 py-2">{c.liderNombre}</td>
                    <td className="px-4 py-2">{c.liderM12Nombre}</td>
                    <td className="px-4 py-2">
                      {confirmandoId === c.id ? (
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-slate-600">¿Eliminar?</span>
                          <button
                            onClick={() => handleEliminar(c)}
                            disabled={borrandoId === c.id}
                            className="font-medium text-red-600 hover:underline disabled:opacity-50"
                          >
                            {borrandoId === c.id ? "Eliminando..." : "Sí, eliminar"}
                          </button>
                          <button
                            onClick={() => setConfirmandoId(null)}
                            className="text-slate-500 hover:underline"
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditandoId(c.id)}
                            className="mr-3 text-blue-600 hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setConfirmandoId(c.id)}
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
