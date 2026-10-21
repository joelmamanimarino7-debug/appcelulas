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

// Fecha local (no UTC): las células se reúnen de noche y en Bolivia
// toISOString() ya devuelve el día siguiente a partir de las 20:00.
function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MINUTOS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

// text-base en móvil evita que iOS haga zoom al enfocar un campo.
export const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500 sm:text-sm";

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
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function Section({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-sm text-slate-500">{descripcion}</p>}
      </header>
      {children}
    </section>
  );
}

export function CelulaInformeForm({
  celulaId,
  celulaInicial,
  onSaved,
}: {
  celulaId: string;
  celulaInicial?: Celula;
  onSaved: (informeId: string) => void;
}) {
  const [celula, setCelula] = useState<Celula | null>(celulaInicial ?? null);
  const [loadingCelula, setLoadingCelula] = useState(!celulaInicial);
  const [errorCarga, setErrorCarga] = useState(false);
  const [intento, setIntento] = useState(0);
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
    if (celulaInicial) return;
    let cancelado = false;
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 15000)
    );
    Promise.race([getDoc(doc(db, "celulas", celulaId)), timeout])
      .then((snap) => {
        if (cancelado) return;
        if (snap.exists()) {
          setCelula({ id: snap.id, ...(snap.data() as Omit<Celula, "id">) });
        }
        setLoadingCelula(false);
      })
      .catch(() => {
        if (cancelado) return;
        setErrorCarga(true);
        setLoadingCelula(false);
      });
    return () => {
      cancelado = true;
    };
  }, [celulaId, celulaInicial, intento]);

  // Precarga opcional de dirección/teléfono/día/hora del último informe. Corre
  // en segundo plano y nunca bloquea el formulario: los líderes sin sesión no
  // tienen permiso para leer informes, y en conexiones lentas puede tardar.
  useEffect(() => {
    let cancelado = false;
    getDocs(
      query(
        collection(db, "informes"),
        where("celulaId", "==", celulaId),
        orderBy("fecha", "desc"),
        limit(1)
      )
    )
      .then((lastSnap) => {
        if (cancelado || lastSnap.empty) return;
        const last = lastSnap.docs[0].data() as Informe;
        setDireccion((v) => v || (last.direccion ?? ""));
        setTelefono((v) => v || (last.telefono ?? ""));
        setDiaReunion((v) => v || (last.diaReunion ?? ""));
        setHora((v) => v || (last.hora ?? ""));
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
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
      setError("No se pudo guardar el informe. Revisa tu conexión e intenta de nuevo.");
      setSubmitting(false);
    }
  }

  if (loadingCelula) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        Cargando datos de la célula...
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-slate-600">
          No pudimos cargar los datos. Revisa tu conexión a internet.
        </p>
        <button
          type="button"
          onClick={() => {
            setErrorCarga(false);
            setLoadingCelula(true);
            setIntento((n) => n + 1);
          }}
          className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!celula) {
    return <p className="py-16 text-center text-sm text-slate-600">No se encontró esa célula.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-sm sm:p-6">
        <p className="text-sm font-medium text-blue-100">Informe semanal</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold">Célula N° {celula.numero}</h1>
          {celula.nombre && (
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
              {celula.nombre}
            </span>
          )}
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-1 text-sm text-blue-50 sm:grid-cols-2">
          <div>
            <dt className="inline text-blue-200">Líder: </dt>
            <dd className="inline font-medium">{celula.liderNombre}</dd>
          </div>
          <div>
            <dt className="inline text-blue-200">Líder M12: </dt>
            <dd className="inline font-medium">{celula.liderM12Nombre}</dd>
          </div>
        </dl>
      </div>

      <Section titulo="La reunión" descripcion="Cuándo se reunieron y cómo les fue.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Fecha" className="col-span-2 sm:col-span-1">
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Asistencia">
            <input
              type="number"
              inputMode="numeric"
              required
              min="0"
              placeholder="0"
              value={asist}
              onChange={(e) => setAsist(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Ofrenda (Bs.)">
            <input
              type="number"
              inputMode="decimal"
              required
              min="0"
              step="0.01"
              placeholder="0.00"
              value={ofrendaBs}
              onChange={(e) => setOfrendaBs(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Día de reunión" className="col-span-2 sm:col-span-1">
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
          <Field label="Hora" className="col-span-2 sm:col-span-2">
            <div className="flex items-center gap-2">
              <select
                required
                aria-label="Hora"
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
              <span className="text-lg font-medium text-slate-400">:</span>
              <select
                required
                aria-label="Minutos"
                value={hora.split(":")[1] ?? ""}
                onChange={(e) => {
                  const h = hora.split(":")[0] ?? "00";
                  setHora(e.target.value ? `${h}:${e.target.value}` : "");
                }}
                className={inputClass}
              >
                <option value="">Min</option>
                {MINUTOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </Field>
        </div>
      </Section>

      <Section titulo="Lugar" descripcion="Dónde se realizó la célula.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Anfitrión(a)">
            <input
              type="text"
              required
              autoComplete="off"
              value={anfitrion}
              onChange={(e) => setAnfitrion(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Teléfono">
            <input
              type="tel"
              inputMode="tel"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Dirección de la célula" className="sm:col-span-2">
            <input
              type="text"
              required
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section
        titulo="Nómina de presentes"
        descripcion="Escribe el nombre de cada persona. Deja vacíos los espacios que no uses."
      >
        <div className="space-y-6">
          <NominaList
            label="Miembros"
            hint="Ya participaron del encuentro"
            values={miembros}
            max={8}
            onChange={setMiembros}
          />
          <NominaList
            label="Escuela de Líderes"
            hint="Participantes en la Escuela de Líderes"
            values={escuelaLideres}
            max={8}
            onChange={setEscuelaLideres}
          />
          <NominaList
            label="Demás asistentes"
            values={demasAsistentes}
            max={8}
            onChange={setDemasAsistentes}
          />
          <NominaList
            label="Visitas"
            hint="Participan por primera vez"
            values={visitas}
            max={6}
            onChange={setVisitas}
          />
        </div>
      </Section>

      <Section titulo="Observaciones">
        <textarea
          required
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          placeholder="Testimonios, peticiones de oración, novedades..."
          className={inputClass}
        />
      </Section>

      <OfrendaQR />

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:shadow-lg">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">Total de presentes</p>
            <p className="text-2xl font-semibold leading-tight text-slate-900">{totalPresentes}</p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 sm:flex-none sm:px-8"
          >
            {submitting ? "Guardando..." : "Enviar informe"}
          </button>
        </div>
      </div>
    </form>
  );
}
