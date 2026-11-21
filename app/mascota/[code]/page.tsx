import { createClient } from "@/lib/supabase/server";

// HU08 escenario 2: ficha pública con nombre y distrito, sin datos del dueño.
export default async function FichaPublicaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const safe = code.replace(/[^A-Za-z0-9-]/g, "").slice(0, 20);
  const supabase = await createClient();
  const { data } = await supabase.rpc("pet_public", { p_code: safe });
  const pet = data?.[0] as { name: string; species: string; district_name: string } | undefined;

  if (!pet) {
    return (
      <div className="card">
        <h1>Mascota no registrada</h1>
        <p>El código {safe} no figura en el padrón de Lima Norte Limpia.</p>
      </div>
    );
  }
  return (
    <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1>{pet.name}</h1>
      <p><strong>Código:</strong> {safe.toUpperCase()}</p>
      <p><strong>Especie:</strong> {pet.species}</p>
      <p><strong>Distrito:</strong> {pet.district_name}</p>
      <p className="hint">Si encontraste a esta mascota, contacta a la municipalidad de su distrito.</p>
    </div>
  );
}
