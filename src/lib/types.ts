export type Rol = "lider" | "lider_m12" | "admin";

export type Genero = "Mujeres" | "Varones";

export interface Usuario {
  uid: string;
  nombre: string;
  email: string;
  rol: Rol;
  celulaIds?: string[]; // células que lidera personalmente (rol 'lider', o 'lider_m12' si además lidera su propia célula)
  liderM12Id?: string; // solo si rol === 'lider', apunta al uid del lider M12
  activo: boolean;
  celular?: string; // número de WhatsApp, sin código de país
  fechaNacimiento?: string; // ISO yyyy-MM-dd
  genero?: Genero; // solo líder/líder M12, usado para filtrar el líder al crear una célula
}

export interface Celula {
  id: string;
  numero: string;
  nombre?: string; // históricamente el género de la célula ("Mujeres" | "Varones")
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
