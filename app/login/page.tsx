import Image from "next/image";
import { login, signup } from "@/app/login/actions";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
    notice?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params.error ? decodeURIComponent(params.error) : "";

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <Image src="/firekworks-icon.png" width={34} height={48} alt="" priority />
          <div>
            <strong>Firekworks Leads</strong>
            <span>CRM comercial V4</span>
          </div>
        </div>

        <form className="login-form">
          <input type="hidden" name="next" value={params.next || "/"} />
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Contraseña
            <input name="password" type="password" autoComplete="current-password" required minLength={6} />
          </label>
          <div className="login-actions">
            <button className="button" formAction={login}>
              Entrar
            </button>
            <button className="button button--ghost" formAction={signup}>
              Crear acceso
            </button>
          </div>
          {params.notice === "check-email" ? (
            <p className="form-note">Revisa el email para confirmar el acceso.</p>
          ) : null}
          {error ? <p className="form-error">{error === "supabase" ? "Configura Supabase para activar Auth." : error}</p> : null}
        </form>
      </section>
    </main>
  );
}
