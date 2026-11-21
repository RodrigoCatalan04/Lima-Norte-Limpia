import Link from "next/link";
import Messages from "@/components/Messages";
import { DISTRICTS } from "@/lib/validation";
import { signUp } from "../actions";

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="card" style={{ maxWidth: 460, margin: "0 auto" }}>
      <h1>Crear cuenta de vecino</h1>
      <Messages error={error} />
      <form action={signUp}>
        <label htmlFor="fullName">Nombre completo</label>
        <input id="fullName" name="fullName" autoComplete="name" required minLength={2} maxLength={80} />
        <label htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Contraseña (mínimo 8 caracteres)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
        <label htmlFor="districtId">Distrito</label>
        <select id="districtId" name="districtId" required defaultValue="">
          <option value="" disabled>Selecciona tu distrito</option>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <button className="btn" type="submit">Registrarme</button>
      </form>
      <p className="hint">¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link></p>
    </div>
  );
}
