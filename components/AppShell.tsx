import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  currentView: "radar" | "pipeline" | "ruta";
};

const navItems = [
  { href: "/", id: "radar", label: "Radar", icon: "radar" },
  { href: "/pipeline", id: "pipeline", label: "Pipeline", icon: "pipeline" },
  { href: "/ruta", id: "ruta", label: "Ruta", icon: "route" }
] as const;

export function AppShell({ children, currentView }: AppShellProps) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand__mark">
            <Image src="/firekworks-icon.png" width={22} height={32} alt="" priority />
          </span>
          <span>
            <strong>Firekworks</strong>
            <small>Leads</small>
          </span>
        </Link>

        <nav className="sidebar__nav" aria-label="Navegación principal">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={currentView === item.id ? "nav-item nav-item--active" : "nav-item"}
            >
              <span className={`css-icon css-icon--${item.icon}`} aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar__note">
          <span>Hoy</span>
          <strong>Prioriza visitas con movimiento real y hueco digital claro.</strong>
          <form action="/auth/signout" method="post">
            <button className="sidebar__logout" type="submit">
              Salir
            </button>
          </form>
        </div>
      </aside>

      <div className="main-pane">{children}</div>
    </div>
  );
}
