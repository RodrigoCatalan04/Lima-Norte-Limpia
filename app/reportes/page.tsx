import Link from "next/link";
import Messages from "@/components/Messages";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/session";
import { REPORT_STATUS_LABEL, REPORT_TYPES } from "@/lib/validation";

export default async function MisReportesPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  const session = await getSessionProfile();
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("reports")
    .select("id, type, description, status, closing_comment, created_at, district_id")
    .eq("reporter_id", session!.userId)
    .order("created_at", { ascending: false });

  return (
    <>
      <h1>Mis reportes</h1>
      <Messages error={error} ok={ok} />
      <Link className="btn" href="/reportes/nuevo">Nuevo reporte</Link>
      <h2>Historial</h2>
      {!reports?.length ? (
        <p className="hint">Aún no has hecho reportes.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Fecha</th><th>Tipo</th><th>Estado</th><th>Respuesta del inspector</th></tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</td>
                <td>{REPORT_TYPES.find((t) => t.value === r.type)?.label ?? r.type}</td>
                <td><span className={`badge ${r.status}`}>{REPORT_STATUS_LABEL[r.status] ?? r.status}</span></td>
                <td>{r.closing_comment ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
