import Link from "next/link";
import Messages from "@/components/Messages";
import { signIn } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1>Iniciar sesión</h1>
      <Messages error={error} ok={ok} />
      <form action={signIn}>
        <label htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <button className="btn" type="submit">Ingresar</button>
      </form>
      <p className="hint">
        <Link href="/recuperar">¿Olvidaste tu contraseña?</Link> · <Link href="/registro">Crear cuenta</Link>
      </p>
    </div>
  );
}
