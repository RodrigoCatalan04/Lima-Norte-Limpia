import Messages from "@/components/Messages";
import { requestPasswordReset } from "../actions";

export default async function RecuperarPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1>Recuperar contraseña</h1>
      <Messages error={error} ok={ok} />
      <form action={requestPasswordReset}>
        <label htmlFor="email">Correo de tu cuenta</label>
        <input id="email" name="email" type="email" required />
        <button className="btn" type="submit">Enviar enlace</button>
      </form>
    </div>
  );
}
