"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function OfrendaQR() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "ofrendaQr"), (snap) => {
      setImageUrl(snap.exists() ? (snap.data().imageUrl as string) : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function handleDownload() {
    if (!imageUrl) return;
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qr-ofrenda.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) return null;
  if (!imageUrl) return null;

  return (
    <div className="rounded-xl border border-slate-200 p-4 text-center">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">
        QR para ofrenda digital
      </h3>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Código QR para ofrenda"
        className="mx-auto h-48 w-48 rounded-lg border border-slate-100 object-contain"
      />
      <button
        type="button"
        onClick={handleDownload}
        className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
      >
        Descargar QR
      </button>
    </div>
  );
}
