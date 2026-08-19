export function OfrendaQR() {
  return (
    <div className="rounded-xl border border-slate-200 p-4 text-center">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">
        QR para ofrenda digital
      </h3>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/qr-ofrenda.png"
        alt="Código QR para ofrenda"
        className="mx-auto h-48 w-48 rounded-lg border border-slate-100 object-contain"
      />
      <a
        href="/qr-ofrenda.png"
        download="qr-ofrenda.png"
        className="mt-3 inline-block rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
      >
        Descargar QR
      </a>
    </div>
  );
}
