"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
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
        Tu cuenta de líder todavía no tiene una célula asignada. Pide al
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
    </div>
  );
}

export default function DashboardPage() {
  const { usuario } = useAuth();
  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {usuario?.rol === "lider" ? <LiderDashboard /> : <OtrosRolesInicio />}
      </main>
    </ProtectedRoute>
  );
}
