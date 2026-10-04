import { LANGUAGES } from "@passaporte/shared";
import { Link } from "react-router-dom";
import { ErrorBox, Spinner } from "../components/ui.tsx";
import { api, type Block, type Today } from "../lib/api.ts";
import { useApi, useSession } from "../lib/session.tsx";

const BLOCK_INFO: Record<Block, { title: string; why: string; to: string; icon: string }> = {
  review: { title: "Revisão espaçada", why: "Frases que o algoritmo FSRS sabe que você está prestes a esquecer.", to: "/revisar", icon: "🗂️" },
  input: { title: "Leitura e escuta", why: "Um texto novo no seu nível exato (~95% de palavras conhecidas).", to: "/ler", icon: "📖" },
  shadow: { title: "Shadowing", why: "Ouça, repita junto e veja o que o microfone entendeu.", to: "/shadowing", icon: "🎙️" },
  talk: { title: "Conversa com IA", why: "Fale de verdade; cada erro vira cartão de revisão.", to: "/conversar", icon: "💬" },
};

const PHASE_NAMES = ["", "Fundação", "Expansão", "Consolidação"];

export function Home() {
  const { me } = useSession();
  const { data, error, reload } = useApi<Today>("/study/today");
  const ml = me?.languages.find((l) => l.lang === me.member.active_lang);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!data) return <Spinner />;

  const L = LANGUAGES[data.lang];
  const doneCount = data.blocks.filter((b) => b.done).length;
  const minutes = data.blocks.reduce((s, b) => s + b.minutes, 0);

  async function toggleFamily() {
    await api("/family/checkin", { method: "PUT", body: { did_family: !data!.checkin.did_family } });
    await reload();
  }

  return (
    <div className="space-y-4">
      <section className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-muted">{L.flag} {L.name} · Fase {data.phase} — {PHASE_NAMES[data.phase]}</p>
            <h2 className="text-2xl font-extrabold">Sessão de hoje</h2>
          </div>
          <div className="text-right font-mono">
            <p className="text-2xl text-leaf">{doneCount}/4</p>
            <p className="text-xs text-muted">{minutes} min</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-leaf transition-all" style={{ width: `${(doneCount / 4) * 100}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted">
          Vocabulário estimado: <span className="font-mono text-ink">{data.vocab}</span> palavras ·{" "}
          <span className="font-mono text-ink">{data.dueCards}</span> cartões para revisar
        </p>
      </section>

      {ml && !ml.placement_done && (
        <Link to="/nivelamento" className="card block border-ochre/60 bg-ochre/10">
          <p className="font-bold">🧭 Faça o nivelamento (3 min)</p>
          <p className="text-sm text-muted">Assim os textos e a conversa já começam no seu nível.</p>
        </Link>
      )}

      <ol className="space-y-3">
        {data.blocks.map((b, i) => {
          const info = BLOCK_INFO[b.block];
          return (
            <li key={b.block}>
              <Link to={info.to} className={`card flex items-center gap-3 ${b.done ? "opacity-70" : ""}`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${b.done ? "bg-leaf text-white" : "bg-bg"}`}>
                  {b.done ? "✓" : info.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">
                    {i + 1}. {info.title} <span className="font-mono text-xs font-medium text-muted">~{b.target} min</span>
                  </span>
                  <span className="block text-sm text-muted">{info.why}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <section className="card flex items-center justify-between gap-3">
        <div>
          <p className="font-bold">Noite de idiomas em família</p>
          <p className="text-sm text-muted">Episódio com legenda + conversa depois (~45 min, 1×/semana).</p>
        </div>
        <button onClick={toggleFamily} className={data.checkin.did_family ? "btn-primary" : "btn-ghost"} aria-pressed={data.checkin.did_family}>
          {data.checkin.did_family ? "✓ Feito" : "Marcar"}
        </button>
      </section>
    </div>
  );
}
