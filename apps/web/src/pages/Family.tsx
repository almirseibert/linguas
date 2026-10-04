import { LANGUAGES, type LangCode } from "@passaporte/shared";
import { useState, type FormEvent } from "react";
import { ErrorBox, Spinner } from "../components/ui.tsx";
import { api } from "../lib/api.ts";
import { useApi, useSession } from "../lib/session.tsx";

interface Overview {
  days: string[];
  members: {
    id: number;
    name: string;
    avatar_color: string;
    streak: number;
    languages: { lang: LangCode; phase: number }[];
    week: { date: string; input: boolean; speak: boolean; family: boolean }[];
  }[];
  stats: { weekCheckins: number; bestStreak: number; activeToday: number; total: number };
}

interface LogEntry {
  id: number;
  note: string;
  lang: LangCode | null;
  date: string;
  name: string;
  avatar_color: string;
}

const WEEKDAY = ["D", "S", "T", "Q", "Q", "S", "S"];
const weekday = (date: string) => WEEKDAY[new Date(`${date}T12:00:00`).getDay()];

export function Family() {
  const { me } = useSession();
  const overview = useApi<Overview>("/family/overview");
  const log = useApi<LogEntry[]>("/family/log");
  const [note, setNote] = useState("");

  async function post(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    await api("/family/log", { body: { note, lang: me?.member.active_lang } });
    setNote("");
    await log.reload();
  }

  if (overview.error) return <ErrorBox>{overview.error}</ErrorBox>;
  if (!overview.data) return <Spinner />;
  const { stats, members, days } = overview.data;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-extrabold">Família</h2>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Check-ins na semana", stats.weekCheckins],
          ["Maior sequência", `${stats.bestStreak}🔥`],
          ["Ativos hoje", `${stats.activeToday}/${stats.total}`],
        ].map(([label, value]) => (
          <div key={label} className="card px-2">
            <p className="font-mono text-2xl text-leaf">{value}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>

      <section className="card space-y-4">
        <p className="font-bold">Carimbos dos últimos 7 dias</p>
        <div className="grid grid-cols-[1fr_repeat(7,1.75rem)] items-center gap-1 text-center text-xs text-muted">
          <span />
          {days.map((d) => <span key={d}>{weekday(d)}</span>)}
        </div>
        {members.map((m) => (
          <div key={m.id} className="grid grid-cols-[1fr_repeat(7,1.75rem)] items-center gap-1">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-bold">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: m.avatar_color }} />
                {m.name}
              </p>
              <p className="truncate text-xs text-muted">
                {m.languages.map((l) => `${LANGUAGES[l.lang].flag} F${l.phase}`).join(" ")} · {m.streak}🔥
              </p>
            </div>
            {m.week.map((d) => {
              const count = Number(d.input) + Number(d.speak) + Number(d.family);
              return (
                <span
                  key={d.date}
                  title={`${d.date}: ${[d.input && "ouviu/leu", d.speak && "falou", d.family && "família"].filter(Boolean).join(", ") || "—"}`}
                  className={`grid h-7 w-7 place-items-center rounded-md border text-[10px] font-bold ${
                    count === 0 ? "border-dashed border-line" : count >= 2 ? "border-leaf bg-leaf text-white" : "border-leaf/50 bg-leaf/20 text-leaf"
                  } ${d.family ? "ring-2 ring-ochre" : ""}`}
                >
                  {count || ""}
                </span>
              );
            })}
          </div>
        ))}
        <p className="text-xs text-muted">Número = check-ins do dia (ouvir/ler, falar, família). Contorno ocre = noite em família.</p>
      </section>

      <section className="card space-y-3">
        <p className="font-bold">Mural da família</p>
        <form onSubmit={post} className="flex gap-2">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Uma frase nova, um episódio que viu…" maxLength={1000} />
          <button className="btn-primary">Postar</button>
        </form>
        <ul className="space-y-3">
          {log.data?.map((l) => (
            <li key={l.id} className="border-t border-line pt-3">
              <p className="text-xs text-muted">
                <b style={{ color: l.avatar_color }}>{l.name}</b> · {l.date} {l.lang && LANGUAGES[l.lang].flag}
              </p>
              <p>{l.note}</p>
            </li>
          ))}
          {log.data?.length === 0 && <p className="text-sm text-muted">Ninguém postou ainda. Seja o primeiro!</p>}
        </ul>
      </section>
    </div>
  );
}
