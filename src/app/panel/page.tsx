"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { Celula, Informe } from "@/lib/types";

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function PanelContent() {
  const { usuario } = useAuth();
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [informes, setInformes] = useState<Informe[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(isoDaysAgo(28));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));
  const [macroFiltro, setMacroFiltro] = useState<string | null>(null);
  const informesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (macroFiltro) {
      informesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [macroFiltro]);

  const isAdmin = usuario?.rol === "admin";

  useEffect(() => {
    if (!usuario) return;
    const celulasQuery = isAdmin
      ? query(collection(db, "celulas"), orderBy("numero"))
      : query(collection(db, "celulas"), where("liderM12Id", "==", usuario.uid));
    const unsub = onSnapshot(celulasQuery, (snap) => {
      setCelulas(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Celula, "id">) })));
    });
    return () => unsub();
  }, [usuario, isAdmin]);

  useEffect(() => {
    if (!usuario) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading state before refetching on date range change
    setLoading(true);
    const base = isAdmin
      ? [where("fecha", ">=", startDate), where("fecha", "<=", endDate)]
      : [
          where("liderM12Id", "==", usuario.uid),
          where("fecha", ">=", startDate),
          where("fecha", "<=", endDate),
        ];
    const informesQuery = query(collection(db, "informes"), ...base, orderBy("fecha", "desc"));
    const unsub = onSnapshot(informesQuery, (snap) => {
      setInformes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Informe, "id">) })));
      setLoading(false);
    });
    return () => unsub();
  }, [usuario, isAdmin, startDate, endDate]);

  const totales = useMemo(() => {
    return informes.reduce(
      (acc, inf) => ({
        asistencia: acc.asistencia + (inf.totalPresentes || 0),
        ofrendaBs: acc.ofrendaBs + (inf.ofrendaBs || 0),
        visitas: acc.visitas + (inf.visitas?.length || 0),
      }),
      { asistencia: 0, ofrendaBs: 0, visitas: 0 }
    );
  }, [informes]);

  const ultimaFechaPorCelula = useMemo(() => {
    const map = new Map<string, string>();
    for (const inf of informes) {
      const current = map.get(inf.celulaId);
      if (!current || inf.fecha > current) map.set(inf.celulaId, inf.fecha);
    }
    return map;
  }, [informes]);

  const celulasSinInformeReciente = celulas.filter((c) => {
    if (macroFiltro && c.liderM12Id !== macroFiltro) return false;
    const ultima = ultimaFechaPorCelula.get(c.id);
    return !ultima || ultima < isoDaysAgo(7);
  });

  const porMacrocelula = useMemo(() => {
    const celulaIdsConInforme = new Set(informes.map((i) => i.celulaId));
    const grupos = new Map<
      string,
      { liderM12Id: string; nombre: string; total: number; reportaron: number }
    >();
    for (const c of celulas) {
      if (!grupos.has(c.liderM12Id)) {
        grupos.set(c.liderM12Id, {
          liderM12Id: c.liderM12Id,
          nombre: c.liderM12Nombre,
          total: 0,
          reportaron: 0,
        });
      }
      const g = grupos.get(c.liderM12Id)!;
      g.total += 1;
      if (celulaIdsConInforme.has(c.id)) g.reportaron += 1;
    }
    return Array.from(grupos.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [celulas, informes]);

  const informesFiltrados = macroFiltro
    ? informes.filter((inf) => inf.liderM12Id === macroFiltro)
    : informes;

  const nombreMacroFiltro = macroFiltro
    ? porMacrocelula.find((g) => g.liderM12Id === macroFiltro)?.nombre
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">
          Panel consolidado {isAdmin ? "— toda la iglesia" : "— mis células"}
        </h1>
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            Desde
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-1">
            Hasta
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SummaryCard label="Asistencia total" value={totales.asistencia} />
        <SummaryCard label="Ofrenda Bs." value={totales.ofrendaBs.toFixed(2)} />
        <SummaryCard label="Visitas nuevas" value={totales.visitas} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">
          Estado por macrocélula (rango seleccionado)
        </h2>
        <p className="mb-2 text-xs text-slate-500">
          Haz clic en una fila para ver solo los informes de esa macrocélula.
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Líder M12</th>
                <th className="px-4 py-2 font-medium">Células</th>
                <th className="px-4 py-2 font-medium">Reportaron</th>
              </tr>
            </thead>
            <tbody>
              {porMacrocelula.map((g) => {
                const porcentaje = g.total > 0 ? Math.round((g.reportaron / g.total) * 100) : 0;
                const color =
                  g.reportaron === 0
                    ? "text-red-600"
                    : g.reportaron < g.total
                      ? "text-amber-600"
                      : "text-green-600";
                const seleccionada = macroFiltro === g.liderM12Id;
                return (
                  <tr
                    key={g.liderM12Id}
                    onClick={() => setMacroFiltro(seleccionada ? null : g.liderM12Id)}
                    className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${
                      seleccionada ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-4 py-2">{g.nombre}</td>
                    <td className="px-4 py-2">{g.total}</td>
                    <td className={`px-4 py-2 font-medium ${color}`}>
                      {g.reportaron} de {g.total} ({porcentaje}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div ref={informesRef} className="scroll-mt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">
            Informes en el rango seleccionado
            {nombreMacroFiltro && (
              <span className="font-normal text-slate-500"> — macrocélula de {nombreMacroFiltro}</span>
            )}
          </h2>
          {macroFiltro && (
            <button
              onClick={() => setMacroFiltro(null)}
              className="text-xs text-blue-600 hover:underline"
            >
              Quitar filtro
            </button>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : informesFiltrados.length === 0 ? (
          <p className="text-sm text-slate-500">
            {macroFiltro
              ? "Esa macrocélula no tiene informes en este rango de fechas."
              : "No hay informes en este rango de fechas."}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Célula</th>
                  <th className="px-4 py-2 font-medium">Líder</th>
                  <th className="px-4 py-2 font-medium">Asistencia</th>
                  <th className="px-4 py-2 font-medium">Ofrenda Bs.</th>
                  <th className="px-4 py-2 font-medium">Visitas</th>
                </tr>
              </thead>
              <tbody>
                {informesFiltrados.map((inf) => (
                  <tr key={inf.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <Link href={`/informe/${inf.id}`} className="text-blue-600 hover:underline">
                        {inf.fecha}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{inf.celulaNumero}</td>
                    <td className="px-4 py-2">{inf.liderNombre}</td>
                    <td className="px-4 py-2">{inf.totalPresentes}</td>
                    <td className="px-4 py-2">{inf.ofrendaBs}</td>
                    <td className="px-4 py-2">{inf.visitas.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {celulasSinInformeReciente.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-800">
            Células sin informe en los últimos 7 días ({celulasSinInformeReciente.length})
            {nombreMacroFiltro && (
              <span className="font-normal"> — macrocélula de {nombreMacroFiltro}</span>
            )}
          </h3>
          <ul className="grid grid-cols-1 gap-1 text-sm text-amber-800 sm:grid-cols-2 lg:grid-cols-3">
            {celulasSinInformeReciente.map((c) => (
              <li key={c.id}>
                N° {c.numero} — {c.liderNombre}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function PanelPage() {
  return (
    <ProtectedRoute allow={["lider_m12", "admin"]}>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <PanelContent />
      </main>
    </ProtectedRoute>
  );
}
