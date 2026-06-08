import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  currentView: "leads" | "map" | "route" | "pipeline" | "calendar" | "system";
  userLabel?: string;
  sourceLabel?: string;
};

const navItems = [
  { href: "/prospecting", id: "map", label: "Prospección", icon: "map" },
  { href: "/leads", id: "leads", label: "Leads", icon: "store" },
  { href: "/pipeline", id: "pipeline", label: "Pipeline", icon: "pipeline" },
  { href: "/route", id: "route", label: "Ruta", icon: "route" },
  { href: "/system", id: "system", label: "Sistema", icon: "settings" }
] as const;

export function AppShell({ children, currentView, userLabel, sourceLabel }: AppShellProps) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/leads" className="brand">
          <span className="brand__mark">
            <Image src="/firekworks-icon.png" width={22} height={32} alt="" priority style={{ width: "auto", height: "32px" }} />
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
          <span>Interno</span>
          <strong>{sourceLabel || "Activo"}</strong>
          {userLabel ? <small>{userLabel}</small> : null}
        </div>
      </aside>

      <div className="main-pane">{children}</div>
    </div>
  );
}
