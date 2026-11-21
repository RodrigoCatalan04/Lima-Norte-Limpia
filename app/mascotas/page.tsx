import Messages from "@/components/Messages";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/session";
import { DISTRICTS } from "@/lib/validation";
import { createPet, togglePetVaccination } from "../actions";
import Link from "next/link";

export default async function MascotasPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string; q?: string; dist?: string }> }) {
  const { error, ok, q, dist } = await searchParams;
  const session = await getSessionProfile();
  const supabase = await createClient();
  const isStaff = session!.role === "inspector" || session!.role === "admin";

  const { data: mine } = await supabase
    .from("pets")
    .select("id, code, name, species, breed, sex, vaccinated, district_id, photo_path, updated_at")
    .eq("owner_id", session!.userId)
    .order("created_at", { ascending: false });

  const photoUrls = new Map<string, string>();
  for (const p of mine ?? []) {
    if (p.photo_path) {
      const { data } = await supabase.storage.from("pet-photos").createSignedUrl(p.photo_path, 3600);
      if (data?.signedUrl) photoUrls.set(p.id, data.signedUrl);
    }
  }

  // HU09: el inspector busca por código o distrito (función con control de rol y distrito en la base de datos).
  const code = (q ?? "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 20);
  const districtFilter = DISTRICTS.some((d) => d.id === Number(dist)) ? Number(dist) : null;
  const searched = isStaff && (!!code || districtFilter !== null);
  const found = searched
    ? (await supabase.rpc("pet_lookup", { p_code: code || null, p_district: districtFilter })).data
    : null;

  return (
    <>
      <h1>Mis mascotas</h1>
      <Messages error={error} ok={ok} />

      <form action={createPet} className="card" encType="multipart/form-data">
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
        <label htmlFor="photo">Foto de la mascota (JPG o PNG, máximo 5 MB)</label>
        <input id="photo" name="photo" type="file" accept="image/jpeg,image/png" />
        <label><input type="checkbox" name="vaccinated" /> Vacunación al día</label>
        <button className="btn" type="submit">Registrar</button>
      </form>

      <h2>Mi padrón</h2>
      {!mine?.length ? (
        <p className="hint">Aún no registraste mascotas.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Foto</th><th>Código</th><th>Nombre</th><th>Especie</th><th>Sexo</th><th>Vacunada</th><th>Actualizado</th><th></th></tr>
          </thead>
          <tbody>
            {mine.map((p) => (
              <tr key={p.id}>
                <td>
                  {photoUrls.get(p.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrls.get(p.id)} alt={`Foto de ${p.name}`} width={48} height={48} style={{ objectFit: "cover", borderRadius: 8 }} />
                  ) : "—"}
                </td>
                <td><strong>{p.code}</strong></td>
                <td>{p.name}{p.breed ? ` (${p.breed})` : ""}</td>
                <td>{p.species}</td>
                <td>{p.sex}</td>
                <td>{p.vaccinated ? "Sí" : "No"}</td>
                <td>{new Date(p.updated_at).toLocaleDateString("es-PE")}</td>
                <td>
                  <Link href={`/mascotas/${p.id}`}>Editar</Link>{" "}
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
            <div>
              <label htmlFor="dist">Distrito</label>
              <select id="dist" name="dist" defaultValue={dist ?? ""}>
                <option value="">Todos</option>
                {DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <button className="btn" type="submit" style={{ marginTop: 0 }}>Buscar</button>
          </form>
          {searched && (found?.length ? (
            <table>
              <thead><tr><th>Código</th><th>Mascota</th><th>Vacunada</th><th>Distrito</th><th>Dueño</th><th>Contacto</th></tr></thead>
              <tbody>
                {found.map((p: { code: string; name: string; species: string; breed: string | null; vaccinated: boolean; district_id: number; owner_name: string; owner_email: string }) => (
                  <tr key={p.code}>
                    <td>{p.code}</td>
                    <td>{p.name} ({p.species}{p.breed ? `, ${p.breed}` : ""})</td>
                    <td>{p.vaccinated ? "Sí" : "No"}</td>
                    <td>{DISTRICTS.find((d) => d.id === p.district_id)?.name}</td>
                    <td>{p.owner_name}</td>
                    <td>{p.owner_email}</td>
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
