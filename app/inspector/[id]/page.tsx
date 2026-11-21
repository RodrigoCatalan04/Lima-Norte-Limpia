import { notFound } from "next/navigation";
import Messages from "@/components/Messages";
import { createClient } from "@/lib/supabase/server";
import { DISTRICTS, REPORT_STATUS_LABEL, REPORT_TYPES } from "@/lib/validation";
import { createIntervention, updateReportStatus } from "../../actions";

const KIND_LABEL: Record<string, string> = {
  limpieza: "Limpieza",
  notificacion_dueno: "Notificación al dueño",
  papeleta: "Papeleta",
};

export default async function DetalleReportePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const supabase = await createClient();

  const { data: report } = await supabase.from("reports").select("*").eq("id", id).maybeSingle();
  if (!report) notFound();

  const { data: interventions } = await supabase
    .from("interventions")
    .select("id, kind, notes, pet_code, created_at")
    .eq("report_id", id)
    .order("created_at", { ascending: false });

  let photoUrl: string | null = null;
  if (report.photo_path) {
    const { data } = await supabase.storage.from("report-photos").createSignedUrl(report.photo_path, 3600);
    photoUrl = data?.signedUrl ?? null;
  }
  const mapUrl = `https://www.openstreetmap.org/?mlat=${report.lat}&mlon=${report.lng}#map=18/${report.lat}/${report.lng}`;

  return (
    <>
      <h1>Reporte de {REPORT_TYPES.find((t) => t.value === report.type)?.label.toLowerCase()}</h1>
      <Messages error={error} ok={ok} />
      <div className="card">
        <p>
          <strong>Distrito:</strong> {DISTRICTS.find((d) => d.id === report.district_id)?.name} ·{" "}
          <strong>Fecha:</strong> {new Date(report.created_at).toLocaleString("es-PE")} ·{" "}
          <strong>Estado:</strong> <span className={`badge ${report.status}`}>{REPORT_STATUS_LABEL[report.status]}</span>
        </p>
        {report.description && <p>{report.description}</p>}
        <iframe
          title="Ubicación del reporte"
          style={{ width: "100%", height: 260, border: "1px solid #cbd5e1", borderRadius: 8 }}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${report.lng - 0.003}%2C${report.lat - 0.002}%2C${report.lng + 0.003}%2C${report.lat + 0.002}&layer=mapnik&marker=${report.lat}%2C${report.lng}`}
        />
        <p>
          <a href={mapUrl} target="_blank" rel="noopener noreferrer">Ver ubicación en el mapa ({report.lat.toFixed(5)}, {report.lng.toFixed(5)})</a>
        </p>
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="evidence" src={photoUrl} alt="Evidencia fotográfica del reporte" />
        )}
        {report.closing_comment && <p><strong>Comentario de cierre:</strong> {report.closing_comment}</p>}
      </div>

      <div className="card">
        <h2>Cambiar estado</h2>
        <form action={updateReportStatus}>
          <input type="hidden" name="reportId" value={report.id} />
          <label htmlFor="status">Nuevo estado</label>
          <select id="status" name="status" defaultValue="en_revision">
            <option value="en_revision">En revisión</option>
            <option value="atendido">Atendido</option>
          </select>
          <label htmlFor="comment">Comentario (obligatorio para Atendido)</label>
          <textarea id="comment" name="comment" maxLength={500} />
          <button className="btn" type="submit">Guardar estado</button>
        </form>
      </div>

      <div className="card">
        <h2>Intervenciones</h2>
        {interventions?.length ? (
          <ul>
            {interventions.map((i) => (
              <li key={i.id}>
                {KIND_LABEL[i.kind]} {i.pet_code ? `(mascota ${i.pet_code})` : ""} — {i.notes ?? "sin observaciones"} ·{" "}
                {new Date(i.created_at).toLocaleDateString("es-PE")}
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Aún no hay intervenciones registradas.</p>
        )}
        <form action={createIntervention}>
          <input type="hidden" name="reportId" value={report.id} />
          <label htmlFor="kind">Tipo de intervención</label>
          <select id="kind" name="kind" defaultValue="limpieza">
            {Object.entries(KIND_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <label htmlFor="petCode">Código de mascota (solo si aplica, ej. LNL-0001)</label>
          <input id="petCode" name="petCode" maxLength={20} />
          <label htmlFor="notes">Observaciones</label>
          <textarea id="notes" name="notes" maxLength={500} />
          <button className="btn" type="submit">Registrar intervención</button>
        </form>
      </div>
    </>
  );
}
