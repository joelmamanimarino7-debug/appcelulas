"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { CelulaInformeForm } from "@/components/CelulaInformeForm";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Celula } from "@/lib/types";

function SeleccionarCelula({ celulaIds }: { celulaIds: string[] }) {
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const snaps = await Promise.all(celulaIds.map((id) => getDoc(doc(db, "celulas", id))));
      setCelulas(
        snaps
          .filter((s) => s.exists())
          .map((s) => ({ id: s.id, ...(s.data() as Omit<Celula, "id">) }))
      );
      setLoading(false);
    }
    load();
  }, [celulaIds]);

  if (loading) return <p className="text-sm text-slate-500">Cargando tus células...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">¿Para cuál célula es el informe?</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {celulas.map((c) => (
          <Link
            key={c.id}
            href={`/informe/nuevo?celulaId=${c.id}`}
            className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-400 hover:bg-blue-50"
          >
            <p className="font-medium text-slate-900">Célula N° {c.numero}</p>
            {c.nombre && <p className="text-sm text-slate-500">{c.nombre}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}

function NuevoInformeContent() {
  const { usuario } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const celulaId = searchParams.get("celulaId");
  const celulaIds = useMemo(() => usuario?.celulaIds ?? [], [usuario]);

  useEffect(() => {
    if (!celulaId && celulaIds.length === 1) {
      router.replace(`/informe/nuevo?celulaId=${celulaIds[0]}`);
    }
  }, [celulaId, celulaIds, router]);

  if (celulaIds.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Tu cuenta todavía no tiene una célula asignada. Pide al administrador
        que te asigne una.
      </p>
    );
  }

  if (!celulaId) {
    if (celulaIds.length === 1) {
      return <p className="text-sm text-slate-500">Cargando...</p>;
    }
    return <SeleccionarCelula celulaIds={celulaIds} />;
  }

  if (!celulaIds.includes(celulaId)) {
    return <p className="text-sm text-slate-600">No tienes acceso a esa célula.</p>;
  }

  return (
    <CelulaInformeForm
      celulaId={celulaId}
      onSaved={(id) => router.replace(`/informe/${id}`)}
    />
  );
}

export default function NuevoInformePage() {
  return (
    <ProtectedRoute allow={["lider", "lider_m12", "admin"]}>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Suspense fallback={<p className="text-sm text-slate-500">Cargando...</p>}>
          <NuevoInformeContent />
        </Suspense>
      </main>
    </ProtectedRoute>
  );
}
