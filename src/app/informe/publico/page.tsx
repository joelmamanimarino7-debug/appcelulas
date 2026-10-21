"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CelulaInformeForm, inputClass } from "@/components/CelulaInformeForm";
import { Celula } from "@/lib/types";

type Paso = "buscar" | "confirmar" | "form" | "gracias";

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function Pasos({ paso }: { paso: Paso }) {
  const actual = paso === "buscar" || paso === "confirmar" ? 0 : paso === "form" ? 1 : 2;
  const etiquetas = ["Tu célula", "Informe", "Listo"];
  return (
    <ol className="mb-6 flex items-center gap-2 text-xs font-medium">
      {etiquetas.map((etiqueta, i) => (
        <li key={etiqueta} className="flex flex-1 items-center gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              i < actual
                ? "bg-blue-600 text-white"
                : i === actual
                  ? "bg-blue-600 text-white ring-4 ring-blue-100"
                  : "bg-slate-200 text-slate-500"
            }`}
          >
            {i < actual ? "✓" : i + 1}
          </span>
          <span className={i <= actual ? "text-slate-900" : "text-slate-400"}>{etiqueta}</span>
          {i < etiquetas.length - 1 && (
            <span className={`h-px flex-1 ${i < actual ? "bg-blue-600" : "bg-slate-200"}`} />
          )}
        </li>
      ))}
    </ol>
  );
}

function GeneroBadge({ genero }: { genero?: string }) {
  if (!genero) return null;
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {genero}
    </span>
  );
}

function SeleccionarCelulaPublico({ onElegida }: { onElegida: (celula: Celula) => void }) {
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "celulas"), (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Celula, "id">) }));
      lista.sort((a, b) => Number(a.numero) - Number(b.numero));
      setCelulas(lista);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const resultados = useMemo(() => {
    const q = normalizar(texto);
    if (!q) return [];
    return celulas
      .filter((c) => c.numero.startsWith(q) || normalizar(c.liderNombre).includes(q))
      .slice(0, 8);
  }, [celulas, texto]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">¡Hola, líder! 👋</h1>
        <p className="mt-1 text-slate-600">
          Busca tu célula por número o por tu nombre para llenar el informe de esta semana.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Número de célula o nombre</span>
          <div className="relative">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.45 4.39l3.08 3.08a.75.75 0 1 1-1.06 1.06l-3.08-3.08A7 7 0 0 1 2 9Z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="search"
              autoFocus
              autoComplete="off"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={loading ? "Cargando células..." : "Ej. 89 o María"}
              disabled={loading}
              className={`${inputClass} pl-11`}
            />
          </div>
        </label>

        {texto.trim() && !loading && (
          <div className="mt-3">
            {resultados.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No encontramos ninguna célula con &quot;{texto.trim()}&quot;. Revisa el número o
                pregunta a tu líder M12.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                {resultados.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onElegida(c)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-blue-50 active:bg-blue-100"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-blue-700">
                        {c.numero}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900">
                          {c.liderNombre}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          Célula N° {c.numero}
                          <GeneroBadge genero={c.nombre} />
                        </span>
                      </span>
                      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5 text-slate-300">
                        <path
                          fillRule="evenodd"
                          d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">¿Es tu célula?</h1>
        <p className="mt-1 text-slate-600">Confirma que los datos sean correctos antes de continuar.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">Célula N°</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight text-blue-700">{celula.numero}</p>
        <div className="mt-3 flex justify-center">
          <GeneroBadge genero={celula.nombre} />
        </div>
        <dl className="mt-5 space-y-1 border-t border-slate-100 pt-4 text-sm">
          <div>
            <dt className="inline text-slate-500">Líder: </dt>
            <dd className="inline font-medium text-slate-900">{celula.liderNombre}</dd>
          </div>
          <div>
            <dt className="inline text-slate-500">Líder M12: </dt>
            <dd className="inline font-medium text-slate-900">{celula.liderM12Nombre}</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <button
          onClick={onConfirmar}
          className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99]"
        >
          Sí, es mi célula
        </button>
        <button
          onClick={onCancelar}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50"
        >
          No, buscar otra
        </button>
      </div>
    </div>
  );
}

function Gracias({ celula, onOtro }: { celula: Celula | null; onOtro: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true" className="h-8 w-8 text-green-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="mt-5 text-2xl font-semibold text-slate-900">¡Informe enviado!</h1>
      <p className="mx-auto mt-2 max-w-sm text-slate-600">
        {celula ? `El informe de la célula N° ${celula.numero} quedó registrado. ` : ""}
        Gracias por tu fidelidad y tu servicio esta semana. 🙏
      </p>
      <button
        onClick={onOtro}
        className="mt-6 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Llenar otro informe
      </button>
    </div>
  );
}

export default function InformePublicoPage() {
  const [paso, setPaso] = useState<Paso>("buscar");
  const [celula, setCelula] = useState<Celula | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [paso]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
              PA
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">Primera Asamblea</p>
              <p className="text-xs text-slate-500">Iglesia en Células</p>
            </div>
          </div>
          <Link href="/login" className="text-xs text-slate-400 transition hover:text-slate-600">
            Acceso admin
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 pb-10 pt-6 sm:pt-8">
        <Pasos paso={paso} />
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
            celula={celula}
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
