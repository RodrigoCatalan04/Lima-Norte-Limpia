import { z } from "zod";

export const DISTRICTS = [
  { id: 1, name: "Los Olivos" },
  { id: 2, name: "Comas" },
  { id: 3, name: "San Martín de Porres" },
  { id: 4, name: "Independencia" },
] as const;

export const REPORT_TYPES = [
  { value: "heces", label: "Heces en vereda, parque o berma" },
  { value: "orina_fachada", label: "Orina que deteriora fachadas" },
  { value: "mascota_suelta", label: "Mascota suelta en la calle" },
] as const;

export const REPORT_STATUS_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  en_revision: "En revisión",
  atendido: "Atendido",
};

// Caja geográfica aproximada de los cuatro distritos atendidos (Lima Norte).
export const LIMA_NORTE_BOUNDS = { latMin: -12.04, latMax: -11.88, lngMin: -77.13, lngMax: -77.0 };

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png"] as const;

export function isInsideLimaNorte(lat: number, lng: number): boolean {
  const b = LIMA_NORTE_BOUNDS;
  return lat >= b.latMin && lat <= b.latMax && lng >= b.lngMin && lng <= b.lngMax;
}

const districtId = z.coerce.number().int().refine((v) => DISTRICTS.some((d) => d.id === v), "Distrito no válido");

export const signUpSchema = z.object({
  email: z.string().trim().email("Correo no válido").max(120),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
  fullName: z.string().trim().min(2, "Ingresa tu nombre").max(80),
  districtId,
});

export const signInSchema = z.object({
  email: z.string().trim().email("Correo no válido").max(120),
  password: z.string().min(1, "Ingresa tu contraseña").max(72),
});

export const reportSchema = z
  .object({
    type: z.enum(["heces", "orina_fachada", "mascota_suelta"], { message: "Tipo de reporte no válido" }),
    description: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    districtId,
  })
  .refine((v) => isInsideLimaNorte(v.lat, v.lng), {
    message: "Solo se aceptan reportes dentro de Los Olivos, Comas, San Martín de Porres e Independencia",
    path: ["lat"],
  });

export const petSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre").max(60),
  species: z.enum(["perro", "gato", "otro"], { message: "Especie no válida" }),
  breed: z.string().trim().max(60).optional(),
  sex: z.enum(["macho", "hembra"], { message: "Sexo no válido" }),
  vaccinated: z.coerce.boolean().default(false),
  districtId,
});

export const statusUpdateSchema = z
  .object({
    reportId: z.string().uuid(),
    status: z.enum(["en_revision", "atendido"]),
    comment: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.status !== "atendido" || (v.comment && v.comment.length > 0), {
    message: "Para marcar un reporte como Atendido debes escribir un comentario de cierre",
    path: ["comment"],
  });

export function validatePhoto(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_PHOTO_TYPES as readonly string[]).includes(file.type)) return "La foto debe ser JPG o PNG";
  if (file.size > MAX_PHOTO_BYTES) return "La foto no debe superar los 5 MB";
  return null;
}

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Datos no válidos";
}
