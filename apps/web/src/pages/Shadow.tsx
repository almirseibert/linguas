import { wordDiff } from "@passaporte/shared";
import { useMemo, useState } from "react";
import { AudioCredit, ErrorBox, PageTitle, Spinner, useBlockTimer } from "../components/ui.tsx";
import { type ContentItem, type ShadowSentence } from "../lib/api.ts";
import { useApi, useSession } from "../lib/session.tsx";
import { canListen, listen, playNative } from "../lib/speech.ts";

export function Shadow() {
  const { speechTag } = useSession();
  const native = useApi<ShadowSentence[]>("/study/shadow");
  const content = useApi<{ items: ContentItem[]; phase: number }>("/study/content");
  const [index, setIndex] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const [recording, setRecording] = useState<null | (() => void)>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const finish = useBlockTimer("shadow");

  // Primeiro as frases nativas com áudio de verdade; depois as frases da fase (voz do navegador)
  const sentences = useMemo(() => {
    const fromNative = (native.data ?? []).map((s) => ({ text: s.text, pt: s.pt, audio: s.audio, credit: s.credit }));
    const data = content.data;
    const fromPhase = data
      ? data.items
          .filter((i) => i.type === "phrase" && i.phase === data.phase)
          .map((i) => ({ text: i.content, pt: i.content_pt ?? "", audio: null, credit: null }))
      : [];
    return [...fromNative, ...fromPhase];
  }, [native.data, content.data]);

  const error = native.error ?? content.error;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (native.loading || content.loading) return <Spinner />;
  if (!sentences.length) return <ErrorBox>Nenhuma frase disponível para este idioma ainda.</ErrorBox>;

  const s = sentences[index % sentences.length];
  const result = heard != null ? wordDiff(s.text, heard) : null;

  async function record() {
    setMicError(null);
    setHeard(null);
    const { result, stop } = listen(speechTag);
    setRecording(() => stop);
    try {
      setHeard(await result);
    } catch (e) {
      setMicError(e instanceof Error ? e.message : String(e));
    } finally {
      setRecording(null);
    }
  }

  return (
    <div>
      <PageTitle title="Shadowing" subtitle="1) Ouça  2) Repita junto, imitando o ritmo  3) Grave sozinho" />
      <div className="card space-y-4">
        <p className="font-mono text-xs text-muted">
          {(index % sentences.length) + 1} / {sentences.length} {s.audio ? "· voz nativa" : "· voz sintética"}
        </p>
        <p className="text-2xl font-extrabold">{s.text}</p>
        {s.pt && <p className="text-muted">{s.pt}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => playNative(s.audio, s.text, speechTag, 0.75)}>🐢 Devagar</button>
          <button className="btn-ghost" onClick={() => playNative(s.audio, s.text, speechTag, 1)}>🔊 Normal</button>
          {canListen ? (
            recording ? (
              <button className="btn bg-danger text-white" onClick={recording}>■ Parar</button>
            ) : (
              <button className="btn-primary" onClick={record}>🎙️ Gravar</button>
            )
          ) : (
            <p className="text-sm text-muted">Para gravar, abra no Chrome (computador ou Android).</p>
          )}
        </div>
        <AudioCredit credit={s.credit} />

        {result && (
          <div className="border-t border-line pt-3">
            <p className="mb-1 text-sm font-bold text-muted">
              O microfone entendeu: <span className="font-mono text-ink">{result.score}%</span>
            </p>
            <p className="text-lg">
              {result.words.map((w, i) => (
                <span key={i} className={w.ok ? "text-leaf" : "text-danger underline decoration-dotted"}>{w.word} </span>
              ))}
            </p>
            <p className="mt-1 text-xs text-muted">Ouvido: “{heard || "…"}”</p>
          </div>
        )}
        <ErrorBox>{micError}</ErrorBox>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="btn-ghost" onClick={() => { setIndex(index + 1); setHeard(null); }}>Próxima frase →</button>
        <button
          className={done ? "btn-ghost" : "btn-primary"}
          disabled={done}
          onClick={async () => {
            await finish();
            setDone(true);
          }}
        >
          {done ? "✓ Bloco concluído" : "Concluir bloco"}
        </button>
      </div>
    </div>
  );
}
