"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Rol } from "@/lib/types";

export function ProtectedRoute({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow?: Rol[];
}) {
  const { firebaseUser, usuario, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (firebaseUser && !usuario) {
      // Autenticado pero sin perfil en Firestore: no tiene acceso configurado.
      return;
    }
    if (usuario && allow && !allow.includes(usuario.rol)) {
      router.replace("/dashboard");
    }
  }, [loading, firebaseUser, usuario, allow, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Cargando...
      </div>
    );
  }

  if (!firebaseUser) return null;

  if (!usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-slate-600">
        Tu cuenta no tiene un perfil configurado todavía. Pide a un administrador
        que te asigne un rol.
      </div>
    );
  }

  if (allow && !allow.includes(usuario.rol)) return null;

  return <>{children}</>;
}
