import { LANGUAGES } from "@passaporte/shared";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Reminders } from "../components/Reminders.tsx";
import { Spinner } from "../components/ui.tsx";
import { api } from "../lib/api.ts";
import { useApi, useSession } from "../lib/session.tsx";

interface FamilySettings {
  ai_provider: "claude" | "gemini";
  providers: { name: "claude" | "gemini"; available: boolean }[];
}

const PROVIDER_LABEL = { claude: "Claude (Anthropic)", gemini: "Gemini (Google)" };

export function Settings() {
  const { me, refresh } = useSession();
  const settings = useApi<FamilySettings>("/family/settings");
  const stats = useApi<{ total: number; reviews30d: number; retention: number | null }>("/study/cards/stats");
  const [copied, setCopied] = useState(false);

  if (!me || !settings.data) return <Spinner />;
  const s = settings.data;

  async function setFamilyProvider(p: string) {
    await api("/family/settings", { method: "PUT", body: { ai_provider: p } });
    await settings.reload();
    await refresh();
  }

  async function setMyProvider(p: string | null) {
    await api("/me", { method: "PUT", body: { ai_provider: p } });
    await refresh();
  }

  async function logout() {
    await api("/logout", { body: {} });
    await refresh();
  }

  const L = LANGUAGES[me.member.active_lang];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-extrabold">Ajustes</h2>

      <section className="card space-y-2">
        <p className="font-bold">Convidar a família</p>
        <p className="text-sm text-muted">Cada pessoa abre o app, escolhe “Entrar na família” e digita o código:</p>
        <button
          className="btn-ghost w-full font-mono text-2xl tracking-widest"
          onClick={async () => {
            await navigator.clipboard.writeText(me.family.invite_code);
            setCopied(true);
          }}
        >
          {me.family.invite_code}
        </button>
        {copied && <p className="text-center text-xs text-leaf">Copiado!</p>}
      </section>

      <Reminders />

      <section className="card space-y-3">
        <p className="font-bold">Inteligência artificial</p>
        <div>
          <p className="label">Padrão da família</p>
          <div className="grid grid-cols-2 gap-2">
            {s.providers.map((p) => (
              <button key={p.name} onClick={() => setFamilyProvider(p.name)} className={s.ai_provider === p.name ? "btn-primary" : "btn-ghost"}>
                {PROVIDER_LABEL[p.name]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label">Só para mim</p>
          <select className="input" value={me.member.ai_provider ?? ""} onChange={(e) => setMyProvider(e.target.value || null)}>
            <option value="">Usar o padrão da família</option>
            <option value="claude">{PROVIDER_LABEL.claude}</option>
            <option value="gemini">{PROVIDER_LABEL.gemini}</option>
          </select>
        </div>
        <ul className="text-sm">
          {s.providers.map((p) => (
            <li key={p.name} className={p.available ? "text-leaf" : "text-danger"}>
              {p.available ? "●" : "○"} {PROVIDER_LABEL[p.name]}: {p.available ? "chave configurada" : "sem chave no servidor"}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">Se o escolhido estiver sem chave, o app usa o outro automaticamente.</p>
      </section>

      <section className="card space-y-2">
        <p className="font-bold">{L.flag} Seu progresso em {L.name}</p>
        {stats.data && (
          <p className="text-sm text-muted">
            <span className="font-mono text-ink">{stats.data.total}</span> cartões ·{" "}
            <span className="font-mono text-ink">{stats.data.reviews30d}</span> revisões em 30 dias · retenção{" "}
            <span className="font-mono text-ink">{stats.data.retention == null ? "—" : `${Math.round(stats.data.retention * 100)}%`}</span>
          </p>
        )}
        <Link to="/nivelamento" className="btn-ghost w-full">Refazer nivelamento</Link>
      </section>

      <button className="btn-ghost w-full" onClick={logout}>Sair</button>

      <details className="card text-sm text-muted">
        <summary className="cursor-pointer font-bold text-ink">Créditos e licenças</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Frases nativas e gravações: <a className="underline" href="https://tatoeba.org" target="_blank" rel="noreferrer">Tatoeba</a> — textos CC BY 2.0 FR;
            cada áudio mostra autor e licença (ex.: CC BY-NC-ND 3.0, uso não comercial).
          </li>
          <li>Listas de frequência: FrequencyWords, de Hermit Dave (OpenSubtitles 2018), CC BY-SA 4.0.</li>
          <li>Repetição espaçada: ts-fsrs (open-spaced-repetition), MIT.</li>
        </ul>
      </details>
    </div>
  );
}
