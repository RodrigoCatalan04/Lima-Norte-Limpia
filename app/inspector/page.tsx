import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DISTRICTS, REPORT_STATUS_LABEL, REPORT_TYPES } from "@/lib/validation";

type SP = { status?: string; type?: string };

export default async function BandejaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { status, type } = await searchParams;
  const supabase = await createClient();

  // RLS limita automáticamente los resultados al distrito del inspector.
  let query = supabase
    .from("reports")
    .select("id, type, status, district_id, created_at, description")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status && status in REPORT_STATUS_LABEL) query = query.eq("status", status);
  if (type && REPORT_TYPES.some((t) => t.value === type)) query = query.eq("type", type);
  const { data: reports } = await query;

  return (
    <>
      <h1>Bandeja de reportes</h1>
      <form className="filters" method="get">
        <div>
          <label htmlFor="status">Estado</label>
          <select id="status" name="status" defaultValue={status ?? ""}>
            <option value="">Todos</option>
            {Object.entries(REPORT_STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="type">Tipo</label>
          <select id="type" name="type" defaultValue={type ?? ""}>
            <option value="">Todos</option>
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <button className="btn" type="submit" style={{ marginTop: 0 }}>Filtrar</button>
      </form>
      {!reports?.length ? (
        <p className="hint">No hay reportes con esos filtros.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Fecha</th><th>Distrito</th><th>Tipo</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</td>
                <td>{DISTRICTS.find((d) => d.id === r.district_id)?.name}</td>
                <td>{REPORT_TYPES.find((t) => t.value === r.type)?.label}</td>
                <td><span className={`badge ${r.status}`}>{REPORT_STATUS_LABEL[r.status]}</span></td>
                <td><Link href={`/inspector/${r.id}`}>Abrir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
