import { createClient } from "@/lib/supabase/server";
import { REPORT_TYPES } from "@/lib/validation";

type Stats = {
  total: number;
  atendidos: number;
  avg_horas_atencion: number | null;
  mascotas: number;
  por_distrito: { nombre: string; total: number }[];
  por_tipo: { tipo: string; total: number }[];
};

const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
          <span style={{ width: 170 }}>{r.label}</span>
          <div style={{ background: "#1f4e9c", height: 18, width: `${(r.value / max) * 100}%`, minWidth: r.value ? 4 : 0, borderRadius: 4 }} />
          <strong>{r.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from, to } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("dashboard_stats", {
    p_from: isDate(from) ? from : null,
    p_to: isDate(to) ? to : null,
  });
  const s = data as Stats | null;
  const pct = s && s.total > 0 ? Math.round((s.atendidos / s.total) * 100) : 0;

  return (
    <>
      <h1>Indicadores de gestión</h1>
      <form method="get" className="filters">
        <div>
          <label htmlFor="from">Desde</label>
          <input id="from" name="from" type="date" defaultValue={from ?? ""} />
        </div>
        <div>
          <label htmlFor="to">Hasta</label>
          <input id="to" name="to" type="date" defaultValue={to ?? ""} />
        </div>
        <button className="btn" type="submit" style={{ marginTop: 0 }}>Aplicar</button>
      </form>
      {!s ? (
        <p className="hint">No se pudieron cargar los indicadores.</p>
      ) : (
        <>
          <div className="grid2">
            <div className="card"><h2>Reportes</h2><p style={{ fontSize: "2rem", margin: 0 }}>{s.total}</p></div>
            <div className="card"><h2>% atendidos</h2><p style={{ fontSize: "2rem", margin: 0 }}>{pct}%</p></div>
            <div className="card"><h2>Tiempo promedio de atención</h2><p style={{ fontSize: "2rem", margin: 0 }}>{s.avg_horas_atencion === null ? "—" : `${s.avg_horas_atencion} h`}</p></div>
            <div className="card"><h2>Mascotas registradas</h2><p style={{ fontSize: "2rem", margin: 0 }}>{s.mascotas}</p></div>
          </div>
          <div className="card">
            <h2>Reportes por distrito</h2>
            <Bars rows={s.por_distrito.map((d) => ({ label: d.nombre, value: d.total }))} />
          </div>
          <div className="card">
            <h2>Reportes por tipo</h2>
            <Bars rows={s.por_tipo.map((t) => ({ label: REPORT_TYPES.find((x) => x.value === t.tipo)?.label ?? t.tipo, value: t.total }))} />
          </div>
        </>
      )}
    </>
  );
}
