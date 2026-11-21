import { notFound } from "next/navigation";
import Link from "next/link";
import Messages from "@/components/Messages";
import { createClient } from "@/lib/supabase/server";
import { DISTRICTS } from "@/lib/validation";
import { updatePet } from "../../actions";

export default async function EditarMascotaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  // RLS: solo el dueño obtiene la fila.
  const { data: pet } = await supabase.from("pets").select("*").eq("id", id).maybeSingle();
  if (!pet) notFound();

  return (
    <>
      <h1>Editar {pet.name} ({pet.code})</h1>
      <Messages error={error} />
      <form action={updatePet} className="card">
        <input type="hidden" name="petId" value={pet.id} />
        <label htmlFor="name">Nombre</label>
        <input id="name" name="name" defaultValue={pet.name} required maxLength={60} />
        <label htmlFor="species">Especie</label>
        <select id="species" name="species" defaultValue={pet.species}>
          <option value="perro">Perro</option>
          <option value="gato">Gato</option>
          <option value="otro">Otro</option>
        </select>
        <label htmlFor="breed">Raza</label>
        <input id="breed" name="breed" defaultValue={pet.breed ?? ""} maxLength={60} />
        <label htmlFor="sex">Sexo</label>
        <select id="sex" name="sex" defaultValue={pet.sex}>
          <option value="macho">Macho</option>
          <option value="hembra">Hembra</option>
        </select>
        <label htmlFor="districtId">Distrito</label>
        <select id="districtId" name="districtId" defaultValue={pet.district_id}>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <label><input type="checkbox" name="vaccinated" defaultChecked={pet.vaccinated} /> Vacunación al día</label>
        <button className="btn" type="submit">Guardar cambios</button>
      </form>
      <p className="hint"><Link href="/mascotas">Volver a mis mascotas</Link></p>
    </>
  );
}
