export type Rol = "lider" | "lider_m12" | "admin";

export interface Usuario {
  uid: string;
  nombre: string;
  email: string;
  rol: Rol;
  celulaId?: string; // solo si rol === 'lider'
  liderM12Id?: string; // solo si rol === 'lider', apunta al uid del lider M12
  activo: boolean;
}

export interface Celula {
  id: string;
  numero: string;
  nombre?: string;
  liderId: string;
  liderNombre: string;
  liderM12Id: string;
  liderM12Nombre: string;
  activa: boolean;
}

export const NOMINA_KEYS = [
  "miembros",
  "escuelaLideres",
  "demasAsistentes",
  "visitas",
] as const;

export type NominaKey = (typeof NOMINA_KEYS)[number];

export interface Informe {
  id: string;
  celulaId: string;
  celulaNumero: string;
  liderId: string;
  liderNombre: string;
  liderM12Id: string;
  liderM12: string;

  fecha: string; // ISO yyyy-MM-dd
  ofrendaBs: number;
  asist: number;
  anfitrion: string;
  direccion: string;
  telefono: string;
  diaReunion: string;
  hora: string;

  miembros: string[]; // hasta 8
  escuelaLideres: string[]; // hasta 8
  demasAsistentes: string[]; // hasta 8
  visitas: string[]; // hasta 6

  totalPresentes: number;
  observaciones: string;

  createdAt: string;
  updatedAt: string;
}
