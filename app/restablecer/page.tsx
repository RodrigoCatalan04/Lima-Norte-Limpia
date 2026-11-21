import Messages from "@/components/Messages";
import { updatePassword } from "../actions";

export default async function RestablecerPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1>Nueva contraseña</h1>
      <Messages error={error} />
      <form action={updatePassword}>
        <label htmlFor="password">Nueva contraseña (mínimo 8 caracteres)</label>
        <input id="password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
        <button className="btn" type="submit">Guardar</button>
      </form>
    </div>
  );
}
