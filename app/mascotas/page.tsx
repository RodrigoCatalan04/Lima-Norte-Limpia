import Messages from "@/components/Messages";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/session";
import { DISTRICTS } from "@/lib/validation";
import { createPet, togglePetVaccination } from "../actions";

export default async function MascotasPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string; q?: string }> }) {
  const { error, ok, q } = await searchParams;
  const session = await getSessionProfile();
  const supabase = await createClient();
  const isStaff = session!.role === "inspector" || session!.role === "admin";

  const { data: mine } = await supabase
    .from("pets")
    .select("id, code, name, species, breed, sex, vaccinated, district_id")
    .eq("owner_id", session!.userId)
    .order("created_at", { ascending: false });

  // HU09: el inspector busca en el padrón de su distrito (RLS lo limita).
  const code = (q ?? "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 20);
  const found = isStaff && code ? (await supabase.from("pets").select("code, name, species, breed, district_id, owner_id").ilike("code", `%${code}%`).limit(20)).data : null;

  return (
    <>
      <h1>Mis mascotas</h1>
      <Messages error={error} ok={ok} />

      <form action={createPet} className="card">
        <h2>Registrar mascota</h2>
        <div className="grid2">
          <div>
            <label htmlFor="name">Nombre</label>
            <input id="name" name="name" required maxLength={60} />
          </div>
          <div>
            <label htmlFor="species">Especie</label>
            <select id="species" name="species" defaultValue="perro">
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label htmlFor="breed">Raza (opcional)</label>
            <input id="breed" name="breed" maxLength={60} />
          </div>
          <div>
            <label htmlFor="sex">Sexo</label>
            <select id="sex" name="sex" defaultValue="macho">
              <option value="macho">Macho</option>
              <option value="hembra">Hembra</option>
            </select>
          </div>
          <div>
            <label htmlFor="districtId">Distrito</label>
            <select id="districtId" name="districtId" defaultValue={session!.districtId}>
              {DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
        <label><input type="checkbox" name="vaccinated" /> Vacunación al día</label>
        <button className="btn" type="submit">Registrar</button>
      </form>

      <h2>Mi padrón</h2>
      {!mine?.length ? (
        <p className="hint">Aún no registraste mascotas.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Código</th><th>Nombre</th><th>Especie</th><th>Sexo</th><th>Vacunada</th><th></th></tr>
          </thead>
          <tbody>
            {mine.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.code}</strong></td>
                <td>{p.name}{p.breed ? ` (${p.breed})` : ""}</td>
                <td>{p.species}</td>
                <td>{p.sex}</td>
                <td>{p.vaccinated ? "Sí" : "No"}</td>
                <td>
                  <form action={togglePetVaccination}>
                    <input type="hidden" name="petId" value={p.id} />
                    <input type="hidden" name="vaccinated" value={String(p.vaccinated)} />
                    <button className="btn secondary" type="submit">{p.vaccinated ? "Marcar sin vacuna" : "Marcar vacunada"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isStaff && (
        <>
          <h2>Consultar padrón (inspectores)</h2>
          <form method="get" className="filters">
            <div>
              <label htmlFor="q">Código de mascota</label>
              <input id="q" name="q" defaultValue={code} placeholder="LNL-0001" />
            </div>
            <button className="btn" type="submit" style={{ marginTop: 0 }}>Buscar</button>
          </form>
          {code && (found?.length ? (
            <table>
              <thead><tr><th>Código</th><th>Nombre</th><th>Especie</th><th>Distrito</th></tr></thead>
              <tbody>
                {found.map((p) => (
                  <tr key={p.code}>
                    <td>{p.code}</td>
                    <td>{p.name}{p.breed ? ` (${p.breed})` : ""}</td>
                    <td>{p.species}</td>
                    <td>{DISTRICTS.find((d) => d.id === p.district_id)?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="hint">La mascota no está registrada.</p>
          ))}
        </>
      )}
    </>
  );
}
