"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/session";
import { isRole } from "@/lib/roles";
import {
  DISTRICTS,
  firstError,
  petSchema,
  reportSchema,
  signInSchema,
  signUpSchema,
  statusUpdateSchema,
  validatePhoto,
} from "@/lib/validation";

function go(path: string, kind: "error" | "ok", message: string): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

async function siteUrl() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL ?? h.get("origin") ?? `https://${h.get("host")}`;
}

// ---------- HU01 / HU02 / HU05: autenticación ----------

export async function signUp(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: text(formData, "email"),
    password: text(formData, "password"),
    fullName: text(formData, "fullName"),
    districtId: text(formData, "districtId"),
  });
  if (!parsed.success) go("/registro", "error", firstError(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, district_id: parsed.data.districtId },
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
    },
  });
  if (error) go("/registro", "error", "No se pudo crear la cuenta. Verifica tus datos o inicia sesión si ya estás registrado.");
  go("/login", "ok", "Cuenta creada. Revisa tu correo para confirmarla e inicia sesión.");
}

export async function signIn(formData: FormData) {
  const parsed = signInSchema.safeParse({ email: text(formData, "email"), password: text(formData, "password") });
  if (!parsed.success) go("/login", "error", firstError(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Mensaje genérico: no revela si el correo existe.
  if (error) go("/login", "error", "Correo o contraseña incorrectos");
  // Cada rol aterriza en su pantalla de trabajo.
  const session = await getSessionProfile();
  redirect(session?.role === "admin" ? "/admin/roles" : session?.role === "inspector" ? "/inspector" : "/reportes");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const email = z.string().trim().email().safeParse(text(formData, "email"));
  if (email.success) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${await siteUrl()}/auth/callback?next=/restablecer` });
  }
  go("/recuperar", "ok", "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.");
}

export async function updatePassword(formData: FormData) {
  const password = z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72).safeParse(text(formData, "password"));
  if (!password.success) go("/restablecer", "error", firstError(password.error));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) go("/restablecer", "error", "El enlace expiró. Solicita uno nuevo.");
  go("/reportes", "ok", "Contraseña actualizada");
}

// ---------- HU10 / HU11 / HU13: reportes ----------

export async function createReport(formData: FormData) {
  const session = await getSessionProfile();
  if (!session) go("/login", "error", "Inicia sesión para reportar");

  const parsed = reportSchema.safeParse({
    type: text(formData, "type"),
    description: text(formData, "description") || undefined,
    lat: text(formData, "lat"),
    lng: text(formData, "lng"),
    districtId: text(formData, "districtId"),
  });
  if (!parsed.success) go("/reportes/nuevo", "error", firstError(parsed.error));

  const supabase = await createClient();
  let photoPath: string | null = null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const problem = validatePhoto(photo);
    if (problem) go("/reportes/nuevo", "error", problem);
    const ext = photo.type === "image/png" ? "png" : "jpg";
    photoPath = `${session.userId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("report-photos").upload(photoPath, photo, { contentType: photo.type });
    if (upErr) go("/reportes/nuevo", "error", "No se pudo subir la foto. Intenta nuevamente.");
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: session.userId,
    type: parsed.data.type,
    description: parsed.data.description ?? null,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    district_id: parsed.data.districtId,
    photo_path: photoPath,
  });
  if (error) {
    if (photoPath) await supabase.storage.from("report-photos").remove([photoPath]);
    if (error.message.includes("RATE_LIMIT")) {
      go("/reportes/nuevo", "error", "Alcanzaste el máximo de 5 reportes por hora. Intenta más tarde.");
    }
    go("/reportes/nuevo", "error", "No se pudo registrar el reporte");
  }
  revalidatePath("/reportes");
  go("/reportes", "ok", "Reporte registrado. Puedes seguir su estado aquí.");
}

// ---------- HU14 / HU15 / HU16: fiscalización ----------

export async function updateReportStatus(formData: FormData) {
  const session = await getSessionProfile();
  if (!session || (session.role !== "inspector" && session.role !== "admin")) go("/", "error", "No tienes permiso para esta acción");

  const parsed = statusUpdateSchema.safeParse({
    reportId: text(formData, "reportId"),
    status: text(formData, "status"),
    comment: text(formData, "comment") || undefined,
  });
  const back = `/inspector/${text(formData, "reportId")}`;
  if (!parsed.success) go(back, "error", firstError(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({
      status: parsed.data.status,
      closing_comment: parsed.data.comment ?? null,
      handled_by: session.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.reportId);
  if (error) go(back, "error", "No se pudo actualizar el reporte");
  revalidatePath("/inspector");
  go(back, "ok", "Estado actualizado");
}

const interventionSchema = z.object({
  reportId: z.string().uuid(),
  kind: z.enum(["limpieza", "notificacion_dueno", "papeleta"]),
  notes: z.string().trim().max(500).optional(),
  petCode: z.string().trim().max(20).optional(),
});

export async function createIntervention(formData: FormData) {
  const session = await getSessionProfile();
  if (!session || (session.role !== "inspector" && session.role !== "admin")) go("/", "error", "No tienes permiso para esta acción");

  const parsed = interventionSchema.safeParse({
    reportId: text(formData, "reportId"),
    kind: text(formData, "kind"),
    notes: text(formData, "notes") || undefined,
    petCode: text(formData, "petCode") || undefined,
  });
  const back = `/inspector/${text(formData, "reportId")}`;
  if (!parsed.success) go(back, "error", firstError(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.from("interventions").insert({
    report_id: parsed.data.reportId,
    inspector_id: session.userId,
    kind: parsed.data.kind,
    notes: parsed.data.notes ?? null,
    pet_code: parsed.data.petCode ?? null,
  });
  if (error) go(back, "error", "No se pudo registrar la intervención. Verifica el código de mascota.");
  go(back, "ok", "Intervención registrada");
}

// ---------- HU06 / HU07: mascotas ----------

export async function createPet(formData: FormData) {
  const session = await getSessionProfile();
  if (!session) go("/login", "error", "Inicia sesión para registrar una mascota");

  const parsed = petSchema.safeParse({
    name: text(formData, "name"),
    species: text(formData, "species"),
    breed: text(formData, "breed") || undefined,
    sex: text(formData, "sex"),
    vaccinated: formData.get("vaccinated") === "on",
    districtId: text(formData, "districtId"),
  });
  if (!parsed.success) go("/mascotas", "error", firstError(parsed.error));

  const supabase = await createClient();
  let photoPath: string | null = null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const problem = validatePhoto(photo);
    if (problem) go("/mascotas", "error", problem);
    photoPath = `${session.userId}/${crypto.randomUUID()}.${photo.type === "image/png" ? "png" : "jpg"}`;
    const { error: upErr } = await supabase.storage.from("pet-photos").upload(photoPath, photo, { contentType: photo.type });
    if (upErr) go("/mascotas", "error", "No se pudo subir la foto de la mascota");
  }
  const { error } = await supabase.from("pets").insert({
    owner_id: session.userId,
    name: parsed.data.name,
    species: parsed.data.species,
    breed: parsed.data.breed ?? null,
    sex: parsed.data.sex,
    vaccinated: parsed.data.vaccinated,
    district_id: parsed.data.districtId,
    photo_path: photoPath,
  });
  if (error) {
    if (photoPath) await supabase.storage.from("pet-photos").remove([photoPath]);
    go("/mascotas", "error", "No se pudo registrar la mascota");
  }
  revalidatePath("/mascotas");
  go("/mascotas", "ok", "Mascota registrada en el padrón");
}

export async function updatePet(formData: FormData) {
  const session = await getSessionProfile();
  if (!session) go("/login", "error", "Inicia sesión");
  const id = z.string().uuid().safeParse(text(formData, "petId"));
  if (!id.success) go("/mascotas", "error", "Mascota no válida");
  const back = `/mascotas/${id.data}`;
  const parsed = petSchema.safeParse({
    name: text(formData, "name"),
    species: text(formData, "species"),
    breed: text(formData, "breed") || undefined,
    sex: text(formData, "sex"),
    vaccinated: formData.get("vaccinated") === "on",
    districtId: text(formData, "districtId"),
  });
  if (!parsed.success) go(back, "error", firstError(parsed.error));

  const supabase = await createClient();
  // RLS garantiza que solo el dueño pueda modificar su mascota.
  const { data, error } = await supabase
    .from("pets")
    .update({
      name: parsed.data.name,
      species: parsed.data.species,
      breed: parsed.data.breed ?? null,
      sex: parsed.data.sex,
      vaccinated: parsed.data.vaccinated,
      district_id: parsed.data.districtId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id.data)
    .select("id");
  if (error || !data?.length) go(back, "error", "No se pudo actualizar la mascota");
  revalidatePath("/mascotas");
  go("/mascotas", "ok", "Datos de la mascota actualizados");
}

export async function togglePetVaccination(formData: FormData) {
  const session = await getSessionProfile();
  if (!session) go("/login", "error", "Inicia sesión");
  const id = z.string().uuid().safeParse(text(formData, "petId"));
  if (!id.success) go("/mascotas", "error", "Mascota no válida");
  const supabase = await createClient();
  await supabase
    .from("pets")
    .update({ vaccinated: text(formData, "vaccinated") !== "true", updated_at: new Date().toISOString() })
    .eq("id", id.data);
  revalidatePath("/mascotas");
  go("/mascotas", "ok", "Datos actualizados");
}

// ---------- HU03: administración de roles ----------

export async function setUserRole(formData: FormData) {
  const session = await getSessionProfile();
  if (!session || session.role !== "admin") go("/", "error", "No tienes permiso para esta acción");

  const parsed = z
    .object({
      userId: z.string().uuid(),
      role: z.string().refine(isRole, "Rol no válido"),
      districtId: z.coerce.number().int().refine((v) => DISTRICTS.some((d) => d.id === v), "Distrito no válido"),
    })
    .safeParse({ userId: text(formData, "userId"), role: text(formData, "role"), districtId: text(formData, "districtId") });
  if (!parsed.success) go("/admin/roles", "error", firstError(parsed.error));
  if (parsed.data.userId === session.userId) go("/admin/roles", "error", "No puedes cambiar tu propio rol");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role, district_id: parsed.data.districtId })
    .eq("id", parsed.data.userId);
  if (error) go("/admin/roles", "error", "No se pudo actualizar el usuario");
  revalidatePath("/admin/roles");
  go("/admin/roles", "ok", "Usuario actualizado");
}
