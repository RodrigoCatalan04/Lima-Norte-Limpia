import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSessionProfile } from "@/lib/session";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Lima Norte Limpia",
  description: "Mascotas y salubridad en Lima Norte: padrón de mascotas, reportes ciudadanos y fiscalización municipal",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionProfile();
  return (
    <html lang="es">
      <body>
        <header className="top">
          <Link href="/" className="brand">Lima Norte Limpia</Link>
          <Link href="/mapa">Mapa de calor</Link>
          {session && <Link href="/reportes">Mis reportes</Link>}
          {session && <Link href="/reportes/nuevo">Reportar</Link>}
          {session && <Link href="/mascotas">Mis mascotas</Link>}
          {session && (session.role === "inspector" || session.role === "admin") && <Link href="/inspector">Bandeja</Link>}
          {session?.role === "admin" && <Link href="/admin/dashboard">Indicadores</Link>}
          {session?.role === "admin" && <Link href="/admin/roles">Usuarios</Link>}
          {session ? (
            <form action={signOut}>
              <button className="btn link" type="submit">Salir ({session.fullName.split(" ")[0]})</button>
            </form>
          ) : (
            <>
              <Link href="/login">Ingresar</Link>
              <Link href="/registro">Registrarme</Link>
            </>
          )}
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
