import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { OfrendaQR } from "@/components/OfrendaQR";

export default function QRAdminPage() {
  return (
    <ProtectedRoute allow={["admin"]}>
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="space-y-6">
          <h1 className="text-xl font-semibold text-slate-900">QR de ofrenda</h1>
          <p className="text-sm text-slate-600">
            El QR es una imagen estática del proyecto (
            <code>public/qr-ofrenda.png</code>). Para cambiarla, reemplaza ese
            archivo en el código y vuelve a desplegar la app.
          </p>
          <OfrendaQR />
        </div>
      </main>
    </ProtectedRoute>
  );
}
