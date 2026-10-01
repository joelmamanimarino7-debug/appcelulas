"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NominaList } from "@/components/NominaList";
import { OfrendaQR } from "@/components/OfrendaQR";
import { Celula, Informe } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

const DIAS_SEMANA = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function CelulaInformeForm({
  celulaId,
  onSaved,
}: {
  celulaId: string;
  onSaved: (informeId: string) => void;
}) {
  const [celula, setCelula] = useState<Celula | null>(null);
  const [loadingCelula, setLoadingCelula] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fecha, setFecha] = useState(today());
  const [ofrendaBs, setOfrendaBs] = useState("");
  const [asist, setAsist] = useState("");
  const [anfitrion, setAnfitrion] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [diaReunion, setDiaReunion] = useState("");
  const [hora, setHora] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [miembros, setMiembros] = useState<string[]>([]);
  const [escuelaLideres, setEscuelaLideres] = useState<string[]>([]);
  const [demasAsistentes, setDemasAsistentes] = useState<string[]>([]);
  const [visitas, setVisitas] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const celulaSnap = await getDoc(doc(db, "celulas", celulaId));
      if (celulaSnap.exists()) {
        setCelula({ id: celulaSnap.id, ...(celulaSnap.data() as Omit<Celula, "id">) });
      }

      // Precargar dirección/teléfono/día/hora del último informe si se puede
      // leer (los líderes sin sesión no tienen permiso para ver informes
      // pasados, así que simplemente se omite el precargado en ese caso).
      try {
        const q = query(
          collection(db, "informes"),
          where("celulaId", "==", celulaId),
          orderBy("fecha", "desc"),
          limit(1)
        );
        const lastSnap = await getDocs(q);
        if (!lastSnap.empty) {
          const last = lastSnap.docs[0].data() as Informe;
          setDireccion(last.direccion ?? "");
          setTelefono(last.telefono ?? "");
          setDiaReunion(last.diaReunion ?? "");
          setHora(last.hora ?? "");
        }
      } catch {
        // Sin permiso para leer informes anteriores: se continúa sin precargar.
      }
      setLoadingCelula(false);
    }
    load();
  }, [celulaId]);

  const totalPresentes = [...miembros, ...escuelaLideres, ...demasAsistentes, ...visitas].filter(
    (n) => n.trim() !== ""
  ).length;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!celula) return;
    setError(null);
    setSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const payload: Omit<Informe, "id"> = {
        celulaId: celula.id,
        celulaNumero: celula.numero,
        liderId: celula.liderId,
        liderNombre: celula.liderNombre,
        liderM12Id: celula.liderM12Id,
        liderM12: celula.liderM12Nombre,
        fecha,
        ofrendaBs: Number(ofrendaBs) || 0,
        asist: Number(asist) || 0,
        anfitrion,
        direccion,
        telefono,
        diaReunion,
        hora,
        miembros: miembros.filter((n) => n.trim() !== ""),
        escuelaLideres: escuelaLideres.filter((n) => n.trim() !== ""),
        demasAsistentes: demasAsistentes.filter((n) => n.trim() !== ""),
        visitas: visitas.filter((n) => n.trim() !== ""),
        totalPresentes,
        observaciones,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const ref = await addDoc(collection(db, "informes"), payload);
      onSaved(ref.id);
    } catch {
      setError("No se pudo guardar el informe. Intenta de nuevo.");
      setSubmitting(false);
    }
  }

  if (loadingCelula) {
    return <p className="text-sm text-slate-500">Cargando datos de la célula...</p>;
  }

  if (!celula) {
    return <p className="text-sm text-slate-600">No se encontró esa célula.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Informe semanal — Célula N° {celula.numero}
        </h1>
        <p className="text-sm text-slate-500">Líder: {celula.liderNombre}</p>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Fecha">
          <input
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Ofrenda Bs.">
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={ofrendaBs}
            onChange={(e) => setOfrendaBs(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Asistencia">
          <input
            type="number"
            required
            min="0"
            value={asist}
            onChange={(e) => setAsist(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Anfitrión(a)">
          <input
            type="text"
            required
            value={anfitrion}
            onChange={(e) => setAnfitrion(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Teléfono">
          <input
            type="text"
            required
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Dirección de célula" className="sm:col-span-2 lg:col-span-2">
          <input
            type="text"
            required
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Día de reunión">
          <select
            required
            value={diaReunion}
            onChange={(e) => setDiaReunion(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona...</option>
            {DIAS_SEMANA.map((dia) => (
              <option key={dia} value={dia}>
                {dia}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hora">
          <div className="flex gap-2">
            <select
              required
              value={hora.split(":")[0] ?? ""}
              onChange={(e) => {
                const m = hora.split(":")[1] ?? "00";
                setHora(e.target.value ? `${e.target.value}:${m}` : "");
              }}
              className={inputClass}
            >
              <option value="">Hora</option>
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <select
              required
              value={hora.split(":")[1] ?? ""}
              onChange={(e) => {
                const h = hora.split(":")[0] ?? "00";
                setHora(e.target.value ? `${h}:${e.target.value}` : "");
              }}
              className={inputClass}
            >
              <option value="">Min</option>
              {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map(
                (m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                )
              )}
            </select>
          </div>
        </Field>
        <Field label="Líder M12">
          <input
            type="text"
            value={celula.liderM12Nombre}
            disabled
            className={`${inputClass} bg-slate-50 text-slate-500`}
          />
        </Field>
      </section>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">Nómina de los presentes</h2>
        <NominaList
          label="A. Miembros (que ya participaron del encuentro)"
          values={miembros}
          max={8}
          onChange={setMiembros}
        />
        <NominaList
          label="B. Cuántos participantes en la Escuela de Líderes"
          values={escuelaLideres}
          max={8}
          onChange={setEscuelaLideres}
        />
        <NominaList
          label="C. Demás asistentes"
          values={demasAsistentes}
          max={8}
          onChange={setDemasAsistentes}
        />
        <NominaList
          label="D. Visitas (que participan por primera vez)"
          values={visitas}
          max={6}
          onChange={setVisitas}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <Field label="Observaciones">
          <textarea
            required
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </Field>
      </section>

      <OfrendaQR />

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">
          Total de presentes (calculado):{" "}
          <span className="font-semibold text-slate-900">{totalPresentes}</span>
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Guardando..." : "Guardar informe"}
        </button>
      </div>
    </form>
  );
}
