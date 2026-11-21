import Link from "next/link";
import Messages from "@/components/Messages";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  return (
    <>
      <Messages error={error} ok={ok} />
      <h1>Lima Norte Limpia</h1>
      <p>
        Plataforma para reducir los desechos de mascotas en Los Olivos, Comas, San Martín de Porres e Independencia: registra a
        tu mascota, reporta puntos críticos con foto y ubicación, y sigue la atención municipal.
      </p>
      <div className="grid2">
        <div className="card">
          <h2>Reportar un punto crítico</h2>
          <p>Marca en el mapa dónde hay heces, orina en fachadas o mascotas sueltas.</p>
          <Link className="btn" href="/reportes/nuevo">Reportar</Link>
        </div>
        <div className="card">
          <h2>Registrar mi mascota</h2>
          <p>Forma parte del padrón distrital y cumple con la tenencia responsable.</p>
          <Link className="btn" href="/mascotas">Mis mascotas</Link>
        </div>
        <div className="card">
          <h2>Mapa de calor</h2>
          <p>Mira la concentración de reportes por zona (no requiere cuenta).</p>
          <Link className="btn" href="/mapa">Ver mapa</Link>
        </div>
      </div>
    </>
  );
}
