import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { completeBlock, type AudioCredit as Credit, type Block } from "../lib/api.ts";

export function PageTitle({ title, subtitle, back = true }: { title: string; subtitle?: string; back?: boolean }) {
  return (
    <div className="mb-4">
      {back && (
        <Link to="/" className="text-sm font-bold text-muted">
          ← Hoje
        </Link>
      )}
      <h2 className="text-2xl font-extrabold">{title}</h2>
      {subtitle && <p className="text-muted">{subtitle}</p>}
    </div>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <div className="my-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{children}</div>;
}

export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return <p className="animate-pulse py-6 text-center text-muted">{label}</p>;
}

/** Mede o tempo gasto na tela para registrar os minutos do bloco da sessão diária. */
export function useBlockTimer(block: Block) {
  const start = useRef(Date.now());
  useEffect(() => {
    start.current = Date.now();
  }, []);
  return () => completeBlock(block, Math.max(1, Math.round((Date.now() - start.current) / 60000)));
}

/** Crédito obrigatório das gravações do Tatoeba (licenças CC BY*). */
export function AudioCredit({ credit }: { credit: Credit | null }) {
  if (!credit) return null;
  return (
    <p className="text-xs text-muted">
      🎧 Voz nativa:{" "}
      <a className="underline" href={credit.url ?? credit.sentence} target="_blank" rel="noreferrer">
        {credit.author}
      </a>{" "}
      ·{" "}
      <a className="underline" href={credit.sentence} target="_blank" rel="noreferrer">
        Tatoeba
      </a>{" "}
      · {credit.license}
    </p>
  );
}

/** Destaca a palavra-alvo dentro da frase. */
export function Highlight({ text, word }: { text: string; word: string | null }) {
  if (!word) return <>{text}</>;
  const re = new RegExp(`(?<![\\p{L}])(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![\\p{L}])`, "iu");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <mark key={i} className="rounded bg-ochre/30 px-0.5 text-inherit">{p}</mark> : p))}
    </>
  );
}

export function SpeakButton({ onClick, label = "Ouvir" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="btn-ghost px-3 py-1.5 text-sm" aria-label={label}>
      🔊 {label}
    </button>
  );
}
