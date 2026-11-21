import Messages from "@/components/Messages";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/session";
import { DISTRICTS } from "@/lib/validation";
import { setUserRole } from "../../actions";

export default async function RolesPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  const session = await getSessionProfile();
  const supabase = await createClient();
  const { data: users } = await supabase.from("profiles").select("id, full_name, role, district_id, created_at").order("created_at", { ascending: false });

  return (
    <>
      <h1>Usuarios y roles</h1>
      <Messages error={error} ok={ok} />
      <p className="hint">Asigna el rol de inspector y el distrito que fiscaliza. Los usuarios nuevos nacen como vecino.</p>
      <table>
        <thead><tr><th>Nombre</th><th>Rol</th><th>Distrito</th><th></th></tr></thead>
        <tbody>
          {users?.map((u) => (
            <tr key={u.id}>
              <td>{u.full_name}</td>
              <td colSpan={3}>
                {u.id === session!.userId ? (
                  <span className="hint">Tu cuenta ({u.role})</span>
                ) : (
                  <form action={setUserRole} className="filters" style={{ margin: 0 }}>
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="role" defaultValue={u.role} aria-label="Rol">
                      <option value="vecino">Vecino</option>
                      <option value="inspector">Inspector</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <select name="districtId" defaultValue={u.district_id} aria-label="Distrito">
                      {DISTRICTS.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <button className="btn" type="submit" style={{ marginTop: 0 }}>Guardar</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
