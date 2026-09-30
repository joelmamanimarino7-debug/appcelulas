"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CelulaInformeForm, Field, inputClass } from "@/components/CelulaInformeForm";
import { Celula } from "@/lib/types";

function SeleccionarCelulaPublico({ onElegida }: { onElegida: (celula: Celula) => void }) {
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "celulas"), orderBy("numero")), (snap) => {
      setCelulas(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Celula, "id">) })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  function handleContinuar() {
    setError(null);
    const numero = texto.split(" — ")[0]?.trim() ?? texto.trim();
    const celula = celulas.find((c) => c.numero === numero);
    if (!celula) {
      setError("No encontramos esa célula. Revisa el número e intenta de nuevo.");
      return;
    }
    onElegida(celula);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Informe semanal de célula</h1>
        <p className="text-sm text-slate-600">Primera Asamblea — Iglesia en Células</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <Field label="Busca tu número de célula">
          <input
            list="celulas-lista"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={loading ? "Cargando células..." : "Ej. 89"}
            disabled={loading}
            className={inputClass}
          />
          <datalist id="celulas-lista">
            {celulas.map((c) => (
              <option key={c.id} value={`${c.numero} — ${c.liderNombre}`} />
            ))}
          </datalist>
        </Field>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          onClick={handleContinuar}
          disabled={loading || !texto.trim()}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

function ConfirmarCelula({
  celula,
  onConfirmar,
  onCancelar,
}: {
  celula: Celula;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Confirma tu célula</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">Célula N°</p>
        <p className="text-3xl font-semibold text-slate-900">{celula.numero}</p>
        <p className="mt-2 text-sm text-slate-600">Líder: {celula.liderNombre}</p>
      </div>
      <div className="flex justify-center gap-3">
        <button
          onClick={onConfirmar}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Sí, es mi célula
        </button>
        <button
          onClick={onCancelar}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          No, buscar de nuevo
        </button>
      </div>
    </div>
  );
}

function Gracias({ onOtro }: { onOtro: () => void }) {
  return (
    <div className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
      <h1 className="text-xl font-semibold text-green-800">¡Informe guardado!</h1>
      <p className="text-sm text-green-700">
        Gracias por reportar tu célula esta semana.
      </p>
      <button
        onClick={onOtro}
        className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm text-green-800 hover:bg-green-100"
      >
        Llenar otro informe
      </button>
    </div>
  );
}

export default function InformePublicoPage() {
  const [paso, setPaso] = useState<"buscar" | "confirmar" | "form" | "gracias">("buscar");
  const [celula, setCelula] = useState<Celula | null>(null);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="font-semibold text-slate-900">Primera Asamblea</span>
          <Link href="/login" className="text-xs text-slate-400 hover:text-slate-600">
            Acceso administrador
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        {paso === "buscar" && (
          <SeleccionarCelulaPublico
            onElegida={(c) => {
              setCelula(c);
              setPaso("confirmar");
            }}
          />
        )}
        {paso === "confirmar" && celula && (
          <ConfirmarCelula
            celula={celula}
            onConfirmar={() => setPaso("form")}
            onCancelar={() => {
              setCelula(null);
              setPaso("buscar");
            }}
          />
        )}
        {paso === "form" && celula && (
          <CelulaInformeForm celulaId={celula.id} onSaved={() => setPaso("gracias")} />
        )}
        {paso === "gracias" && (
          <Gracias
            onOtro={() => {
              setCelula(null);
              setPaso("buscar");
            }}
          />
        )}
      </main>
    </div>
  );
}
