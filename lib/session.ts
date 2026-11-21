import { createClient } from "@/lib/supabase/server";
import { isRole, type Role } from "@/lib/roles";

export type SessionProfile = {
  userId: string;
  email: string | undefined;
  fullName: string;
  districtId: number;
  role: Role;
};

/** Devuelve el usuario autenticado y su perfil, o null si no hay sesión válida. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name, district_id, role").eq("id", user.id).single();
  if (!profile || !isRole(profile.role)) return null;
  return { userId: user.id, email: user.email, fullName: profile.full_name, districtId: profile.district_id, role: profile.role };
}
