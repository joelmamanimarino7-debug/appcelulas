"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const ROL_LABEL: Record<string, string> = {
  lider: "Líder de célula",
  lider_m12: "Líder M12",
  admin: "Administrador",
};

export function Navbar() {
  const { usuario, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (!usuario) return null;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-slate-900">
            Informes de Célula
          </Link>
          <nav className="hidden gap-4 text-sm text-slate-600 sm:flex">
            <Link href="/dashboard" className="hover:text-slate-900">
              Mis informes
            </Link>
            {(usuario.rol === "lider_m12" || usuario.rol === "admin") && (
              <Link href="/panel" className="hover:text-slate-900">
                Panel consolidado
              </Link>
            )}
            {usuario.rol === "admin" && (
              <>
                <Link href="/admin/usuarios" className="hover:text-slate-900">
                  Usuarios
                </Link>
                <Link href="/admin/celulas" className="hover:text-slate-900">
                  Células
                </Link>
                <Link href="/admin/lideres" className="hover:text-slate-900">
                  Líderes
                </Link>
                <Link href="/admin/qr" className="hover:text-slate-900">
                  QR de ofrenda
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="hidden text-right sm:block">
            <p className="font-medium text-slate-900">{usuario.nombre}</p>
            <p className="text-xs text-slate-500">{ROL_LABEL[usuario.rol]}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-100"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
