import { HeatMap } from "@/components/MapLoaders";
import { createClient } from "@/lib/supabase/server";
import { DISTRICTS, REPORT_TYPES } from "@/lib/validation";

type SP = { district?: string; type?: string; from?: string; to?: string };

const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function MapaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { district, type, from, to } = await searchParams;
  const supabase = await createClient();

  // Vista pública sin datos personales (ver supabase/schema.sql).
  let query = supabase.from("report_points").select("lat, lng, type, district_id").limit(5000);
  const d = Number(district);
  if (DISTRICTS.some((x) => x.id === d)) query = query.eq("district_id", d);
  if (type && REPORT_TYPES.some((t) => t.value === type)) query = query.eq("type", type);
  if (isDate(from)) query = query.gte("created_at", `${from}T00:00:00-05:00`);
  if (isDate(to)) query = query.lte("created_at", `${to}T23:59:59-05:00`);
  const { data } = await query;
  const points = (data ?? []).map((p) => ({ lat: p.lat, lng: p.lng }));

  return (
    <>
      <h1>Mapa de calor de puntos críticos</h1>
      <form method="get" className="filters">
        <div>
          <label htmlFor="district">Distrito</label>
          <select id="district" name="district" defaultValue={district ?? ""}>
            <option value="">Todos</option>
            {DISTRICTS.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
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
      <p className="hint">{points.length} reporte(s) en el mapa. Los datos personales de quienes reportan no se muestran.</p>
      <HeatMap points={points} />
    </>
  );
}
