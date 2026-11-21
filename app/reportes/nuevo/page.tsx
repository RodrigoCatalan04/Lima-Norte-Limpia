import Messages from "@/components/Messages";
import { MapPicker } from "@/components/MapLoaders";
import { getSessionProfile } from "@/lib/session";
import { DISTRICTS, REPORT_TYPES } from "@/lib/validation";
import { createReport } from "../../actions";

export default async function NuevoReportePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const session = await getSessionProfile();
  return (
    <>
      <h1>Reportar un punto crítico</h1>
      <Messages error={error} />
      <form action={createReport} className="card">
        <label htmlFor="type">Tipo de problema</label>
        <select id="type" name="type" required defaultValue="">
          <option value="" disabled>Selecciona el tipo</option>
          {REPORT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <label htmlFor="districtId">Distrito</label>
        <select id="districtId" name="districtId" required defaultValue={session?.districtId}>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <label>Ubicación</label>
        <MapPicker />

        <label htmlFor="description">Descripción (opcional)</label>
        <textarea id="description" name="description" maxLength={500} placeholder="Ej.: frente al parque, esquina con la av. principal" />

        <label htmlFor="photo">Foto de evidencia (JPG o PNG, máximo 5 MB)</label>
        <input id="photo" name="photo" type="file" accept="image/jpeg,image/png" />
        <p className="hint">Evita que se vean rostros de personas o placas de vehículos.</p>

        <button className="btn" type="submit">Enviar reporte</button>
      </form>
    </>
  );
}
