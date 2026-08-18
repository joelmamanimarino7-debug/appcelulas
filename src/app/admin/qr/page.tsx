"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { OfrendaQR } from "@/components/OfrendaQR";

function QRAdminContent() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasQr, setHasQr] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "ofrendaQr"), (snap) => {
      setHasQr(snap.exists());
    });
    return () => unsub();
  }, []);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const storageRef = ref(storage, "config/qr-ofrenda.png");
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      await setDoc(doc(db, "config", "ofrendaQr"), {
        imageUrl,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      setError("No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">QR de ofrenda</h1>
      <p className="text-sm text-slate-600">
        Sube la imagen del código QR de pago (ej. QR simple de tu banco o
        billetera). Se mostrará en el formulario de informe y los líderes
        podrán descargarla para compartirla con los miembros.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700">
          {hasQr ? "Reemplazar imagen del QR" : "Subir imagen del QR"}
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          disabled={uploading}
          className="mt-2 text-sm"
        />
        {uploading && <p className="mt-2 text-sm text-slate-500">Subiendo...</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {hasQr && <OfrendaQR />}
    </div>
  );
}

export default function QRAdminPage() {
  return (
    <ProtectedRoute allow={["admin"]}>
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <QRAdminContent />
      </main>
    </ProtectedRoute>
  );
}
