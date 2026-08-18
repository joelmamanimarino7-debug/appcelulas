"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { Informe } from "@/lib/types";

function InformeDetalle({ id }: { id: string }) {
  const [informe, setInforme] = useState<Informe | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "informes", id));
      if (snap.exists()) {
        setInforme({ id: snap.id, ...(snap.data() as Omit<Informe, "id">) });
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <p className="text-sm text-slate-500">Cargando...</p>;
  if (notFound || !informe) {
    return <p className="text-sm text-slate-600">No se encontró este informe.</p>;
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Informe — Célula N° {informe.celulaNumero}
          </h1>
          <p className="text-sm text-slate-500">{informe.fecha}</p>
        </div>
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Volver
        </Link>
      </div>

      <section className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Líder" value={informe.liderNombre} />
        <Info label="Líder M12" value={informe.liderM12} />
        <Info label="Anfitrión(a)" value={informe.anfitrion} />
        <Info label="Ofrenda Bs." value={String(informe.ofrendaBs)} />
        <Info label="Ofrenda $us" value={String(informe.ofrendaUsd)} />
        <Info label="Asistencia" value={String(informe.asist)} />
        <Info label="Dirección" value={informe.direccion} />
        <Info label="Teléfono" value={informe.telefono} />
        <Info label="Día / hora" value={`${informe.diaReunion} ${informe.hora}`} />
      </section>

      <NominaSection title="A. Miembros" items={informe.miembros} />
      <NominaSection title="B. Participantes en Escuela de Líderes" items={informe.escuelaLideres} />
      <NominaSection title="C. Demás asistentes" items={informe.demasAsistentes} />
      <NominaSection title="D. Visitas (primera vez)" items={informe.visitas} />

      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p className="mb-2">
          <span className="font-medium text-slate-700">Observaciones: </span>
          {informe.observaciones || "—"}
        </p>
        <p>
          <span className="font-medium text-slate-700">Total de presentes: </span>
          {informe.totalPresentes}
        </p>
      </section>

      <div className="flex justify-end">
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Imprimir / Exportar PDF
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{value || "—"}</p>
    </div>
  );
}

function NominaSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-800">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Sin registros</p>
      ) : (
        <ol className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-slate-700 sm:grid-cols-2">
          {items.map((name, i) => (
            <li key={i}>
              {i + 1}. {name}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function InformeDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <InformeDetalle id={id} />
      </main>
    </ProtectedRoute>
  );
}
