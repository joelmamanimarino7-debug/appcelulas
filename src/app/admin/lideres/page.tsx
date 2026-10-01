"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { Celula, Informe, Usuario } from "@/lib/types";

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

function EditarDatosRow({ lider, onDone }: { lider: Usuario; onDone: () => void }) {
  const [celular, setCelular] = useState(lider.celular ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(lider.fechaNacimiento ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuardar() {
    setError(null);
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "usuarios", lider.uid), { celular, fechaNacimiento });
      onDone();
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <tr className="border-t border-slate-100 bg-slate-50">
      <td className="px-4 py-2" colSpan={6}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      </td>
    </tr>
  );
}

function LideresContent() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [informesRecientes, setInformesRecientes] = useState<Informe[]>([]);
  const [loading, setLoading] = useState(true);
  const [editandoUid, setEditandoUid] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    const unsubUsuarios = onSnapshot(query(collection(db, "usuarios"), orderBy("nombre")), (snap) => {
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
      unsubUsuarios();
      unsubCelulas();
      unsubInformes();
    };
  }, []);

  const lideres = useMemo(
    () => usuarios.filter((u) => u.rol === "lider" || u.rol === "lider_m12"),
    [usuarios]
  );

  const celulaIdsConInformeReciente = useMemo(
    () => new Set(informesRecientes.map((i) => i.celulaId)),
    [informesRecientes]
  );

  const celulasPorLider = useMemo(() => {
    const map = new Map<string, Celula[]>();
    for (const c of celulas) {
      if (!map.has(c.liderId)) map.set(c.liderId, []);
      map.get(c.liderId)!.push(c);
    }
    return map;
  }, [celulas]);

  const lideresFiltrados = lideres.filter((l) =>
    l.nombre.toLowerCase().includes(filtro.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">Datos de líderes</h1>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </div>
      <p className="text-sm text-slate-600">
        Completa el celular y la fecha de nacimiento de cada líder. El botón de WhatsApp aparece
        para quienes tienen celular registrado y no enviaron el informe en los últimos 7 días.
      </p>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Célula(s)</th>
                <th className="px-4 py-2 font-medium">Celular</th>
                <th className="px-4 py-2 font-medium">Fecha de nacimiento</th>
                <th className="px-4 py-2 font-medium">Informe (7 días)</th>
                <th className="px-4 py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lideresFiltrados.map((l) => {
                if (editandoUid === l.uid) {
                  return <EditarDatosRow key={l.uid} lider={l} onDone={() => setEditandoUid(null)} />;
                }
                const misCelulas = celulasPorLider.get(l.uid) ?? [];
                const numeros = misCelulas.map((c) => c.numero);
                const reporto =
                  misCelulas.length === 0 ||
                  misCelulas.some((c) => celulaIdsConInformeReciente.has(c.id));
                return (
                  <tr key={l.uid} className="border-t border-slate-100">
                    <td className="px-4 py-2">{l.nombre}</td>
                    <td className="px-4 py-2">{numeros.length > 0 ? numeros.join(", ") : "—"}</td>
                    <td className="px-4 py-2">{l.celular || "—"}</td>
                    <td className="px-4 py-2">{l.fechaNacimiento || "—"}</td>
                    <td className="px-4 py-2">
                      {misCelulas.length === 0 ? (
                        <span className="text-slate-400">Sin célula</span>
                      ) : reporto ? (
                        <span className="font-medium text-green-600">Al día</span>
                      ) : (
                        <span className="font-medium text-red-600">Pendiente</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <button
                        onClick={() => setEditandoUid(l.uid)}
                        className="mr-3 text-blue-600 hover:underline"
                      >
                        Editar
                      </button>
                      {!reporto && misCelulas.length > 0 && (
                        l.celular ? (
                          <a
                            href={`https://wa.me/${normalizePhone(l.celular)}?text=${encodeURIComponent(
                              mensajeRecordatorio(l.nombre, numeros)
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:underline"
                          >
                            Recordar por WhatsApp
                          </a>
                        ) : (
                          <span className="text-slate-400">Sin celular</span>
                        )
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

export default function LideresPage() {
  return (
    <ProtectedRoute allow={["admin"]}>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <LideresContent />
      </main>
    </ProtectedRoute>
  );
}
