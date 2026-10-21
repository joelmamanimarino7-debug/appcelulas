export function OfrendaQR() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm sm:flex-row sm:p-6 sm:text-left">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/qr-ofrenda.png"
        alt="Código QR para ofrenda"
        className="h-40 w-40 shrink-0 rounded-xl border border-slate-100 object-contain"
      />
      <div>
        <h2 className="text-base font-semibold text-slate-900">Ofrenda digital</h2>
        <p className="mt-1 text-sm text-slate-500">
          Comparte este QR con los miembros de tu célula para que puedan dar su ofrenda desde el
          celular.
        </p>
        <a
          href="/qr-ofrenda.png"
          download="qr-ofrenda.png"
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.69L6.3 8.47a.75.75 0 1 0-1.06 1.06l4.25 4.25a.75.75 0 0 0 1.06 0l4.25-4.25a.75.75 0 1 0-1.06-1.06l-2.94 2.97V2.75Z" />
            <path d="M3.5 13.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
          </svg>
          Descargar QR
        </a>
      </div>
    </section>
  );
}
