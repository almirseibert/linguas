import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AudioCredit, ErrorBox, Highlight, PageTitle, SpeakButton, Spinner, useBlockTimer } from "../components/ui.tsx";
import { api, type DueCard } from "../lib/api.ts";
import { useApi, useSession } from "../lib/session.tsx";
import { playNative } from "../lib/speech.ts";

const RATINGS = [
  { value: 1, label: "Errei", cls: "bg-danger text-white" },
  { value: 2, label: "Difícil", cls: "bg-ochre text-white" },
  { value: 3, label: "Bom", cls: "bg-leaf text-white" },
  { value: 4, label: "Fácil", cls: "border border-leaf text-leaf" },
];

/**
 * Frases nativas novas (mineradas) são treinadas na direção "entender" (ouvir/ler → significado);
 * frases de fala (sobrevivência, correções da conversa) na direção "produzir" (português → idioma).
 */
const isListening = (c: DueCard) => c.source === "mined";

export function Review() {
  const { speechTag } = useSession();
  const { data: cards, error, loading, reload } = useApi<DueCard[]>("/study/cards/due");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [mining, setMining] = useState(false);
  const shownAt = useRef(Date.now());
  const finish = useBlockTimer("review");

  const card = cards?.[index];
  const play = (rate = 1) => card && playNative(card.audio, card.front, speechTag, rate);

  useEffect(() => {
    shownAt.current = Date.now();
    setRevealed(false);
    if (card && isListening(card)) void play();
  }, [card?.id]);

  async function rate(rating: number) {
    if (!card) return;
    await api(`/study/cards/${card.id}/review`, { body: { rating, elapsedMs: Date.now() - shownAt.current } });
    setReviewed((n) => n + 1);
    if (index + 1 >= (cards?.length ?? 0)) {
      await finish();
      setFinished(true);
    } else setIndex(index + 1);
  }

  async function moreSentences() {
    setMining(true);
    try {
      await api("/study/cards/mine", { body: { count: 5 } });
      setIndex(0);
      setFinished(false);
      await reload();
    } finally {
      setMining(false);
    }
  }

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (loading || !cards) return <Spinner label="Montando sua revisão…" />;

  if (finished || cards.length === 0 || !card) {
    return (
      <div>
        <PageTitle title="Revisão" />
        <div className="card space-y-3 text-center">
          <p className="text-4xl">🎉</p>
          <p className="text-lg font-bold">{reviewed ? `${reviewed} cartões revisados!` : "Nada para revisar agora."}</p>
          <p className="text-muted">O algoritmo agenda cada frase para o momento certo. Volte amanhã.</p>
          <div className="flex flex-col gap-2">
            <Link to="/" className="btn-primary">Voltar para hoje</Link>
            <button className="btn-ghost" onClick={moreSentences} disabled={mining}>
              {mining ? "Escolhendo frases…" : "+5 frases nativas novas"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const listening = isListening(card);
  const ptPrompt = card.back.split("\n")[0];

  return (
    <div>
      <PageTitle
        title="Revisão"
        subtitle={`${index + 1} de ${cards.length} · ${listening ? "ouça e tente entender antes de virar" : "fale a frase em voz alta antes de virar"}`}
      />
      <div className="card min-h-56 space-y-4">
        {listening ? (
          <>
            <p className="text-sm font-bold text-muted">O que significa? {card.state === 0 && <span className="text-ochre">· frase nova</span>}</p>
            <p className="text-2xl font-extrabold">
              <Highlight text={card.front} word={card.focus} />
            </p>
            <div className="flex gap-2">
              <SpeakButton onClick={() => play(1)} />
              <SpeakButton label="Devagar" onClick={() => play(0.75)} />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-muted">Como se diz…</p>
            <p className="text-xl font-bold">{ptPrompt}</p>
          </>
        )}

        {revealed ? (
          <div className="space-y-3 border-t border-line pt-4">
            {listening ? (
              <p className="text-xl font-bold text-leaf">{card.back}</p>
            ) : (
              <>
                <p className="text-2xl font-extrabold text-leaf">
                  <Highlight text={card.front} word={card.focus} />
                </p>
                {card.back.includes("\n") && <p className="text-sm text-muted">{card.back.split("\n").slice(1).join(" ")}</p>}
                <SpeakButton onClick={() => play(1)} />
              </>
            )}
            <AudioCredit credit={card.credit} />
          </div>
        ) : (
          <button
            className="btn-primary w-full"
            onClick={() => {
              setRevealed(true);
              if (!listening) void play();
            }}
          >
            Mostrar resposta
          </button>
        )}
      </div>

      {revealed && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <button key={r.value} onClick={() => rate(r.value)} className={`btn flex-col gap-0 px-1 ${r.cls}`}>
              {r.label}
              <span className="font-mono text-xs opacity-80">{card.intervals[r.value]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
