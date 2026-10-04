import { LANG_CODES, LANGUAGES } from "@passaporte/shared";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../lib/api.ts";
import { useSession } from "../lib/session.tsx";

const NAV = [
  { to: "/", label: "Hoje", icon: "☀️" },
  { to: "/revisar", label: "Revisar", icon: "🗂️" },
  { to: "/conversar", label: "Conversar", icon: "💬" },
  { to: "/familia", label: "Família", icon: "👨‍👩‍👧‍👦" },
  { to: "/ajustes", label: "Ajustes", icon: "⚙️" },
];

export function Layout() {
  const { me, refresh } = useSession();
  if (!me) return null;
  const active = me.member.active_lang;

  async function switchLang(lang: string) {
    await api("/me", { method: "PUT", body: { active_lang: lang } });
    await refresh();
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-wider text-muted">{me.family.name}</p>
          <h1 className="truncate text-lg font-extrabold">Olá, {me.member.name}</h1>
        </div>
        <div className="flex shrink-0 rounded-xl border border-line bg-surface p-1" role="group" aria-label="Idioma">
          {LANG_CODES.map((code) => (
            <button
              key={code}
              onClick={() => switchLang(code)}
              aria-pressed={active === code}
              className={`rounded-lg px-2.5 py-1 text-sm font-bold ${active === code ? "bg-leaf text-white" : "text-muted"}`}
              title={LANGUAGES[code].name}
            >
              {LANGUAGES[code].flag} {code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* key força recarregar as telas ao trocar de idioma */}
      <main key={active} className="flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-xs font-bold ${isActive ? "text-leaf" : "text-muted"}`}
            >
              <span className="text-lg" aria-hidden>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
