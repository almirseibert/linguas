import { useEffect, useRef, useState, type FormEvent } from "react";
import { ErrorBox, PageTitle, useBlockTimer } from "../components/ui.tsx";
import { api } from "../lib/api.ts";
import { canListen, listen, speak } from "../lib/speech.ts";

interface Correction {
  original: string;
  corrected: string;
  explanation_pt: string;
}

interface Msg {
  role: "user" | "assistant";
  text: string;
  pt?: string;
  corrections?: Correction[];
}

interface StartResponse {
  id: number;
  topic: string;
  provider: string;
  speechTag: string;
  message: { reply: string; reply_pt: string };
}

export function Talk() {
  const [conv, setConv] = useState<Omit<StartResponse, "message"> | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<null | (() => void)>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [done, setDone] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const finish = useBlockTimer("talk");

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function guard(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const start = () =>
    guard(async () => {
      const r = await api<StartResponse>("/ai/talk", { body: { topic: topic || undefined } });
      setConv(r);
      setMessages([{ role: "assistant", text: r.message.reply, pt: r.message.reply_pt }]);
      if (autoSpeak) void speak(r.message.reply, r.speechTag);
    });

  const send = (content: string) =>
    guard(async () => {
      if (!conv || !content.trim()) return;
      setMessages((m) => [...m, { role: "user", text: content }]);
      setText("");
      const r = await api<{ reply: string; reply_pt: string; corrections: Correction[] }>(`/ai/talk/${conv.id}`, { body: { text: content } });
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { ...copy[copy.length - 1], corrections: r.corrections };
        return [...copy, { role: "assistant", text: r.reply, pt: r.reply_pt }];
      });
      if (autoSpeak) void speak(r.reply, conv.speechTag);
    });

  async function talk() {
    if (!conv) return;
    const { result, stop } = listen(conv.speechTag);
    setRecording(() => stop);
    try {
      const heard = await result;
      if (heard) await send(heard);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRecording(null);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send(text);
  };

  if (!conv) {
    return (
      <div>
        <PageTitle title="Conversa com IA" subtitle="Responda falando sempre que puder — é o que mais acelera a fluência." />
        <div className="card space-y-3">
          <label className="label" htmlFor="topic">Sobre o que conversar? (opcional)</label>
          <input id="topic" className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="ex.: meu trabalho, a viagem de férias…" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} /> Ler as respostas em voz alta
          </label>
          <button className="btn-primary w-full" onClick={start} disabled={busy}>
            {busy ? "Preparando…" : "Começar conversa"}
          </button>
        </div>
        <ErrorBox>{error}</ErrorBox>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageTitle title="Conversa com IA" subtitle={`Tema: ${conv.topic} · via ${conv.provider === "gemini" ? "Gemini" : "Claude"}`} />

      <div className="space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${m.role === "user" ? "bg-leaf text-white" : "border border-line bg-surface"}`}>
              <p>{m.text}</p>
              {m.role === "assistant" && (
                <div className="mt-1 flex gap-3 text-xs text-muted">
                  <button onClick={() => speak(m.text, conv.speechTag)}>🔊 ouvir</button>
                  {m.pt && (
                    <details>
                      <summary className="cursor-pointer">tradução</summary>
                      <p className="mt-1 italic">{m.pt}</p>
                    </details>
                  )}
                </div>
              )}
            </div>
            {m.corrections?.map((c, j) => (
              <div key={j} className="mt-1 max-w-[85%] rounded-xl border border-ochre/50 bg-ochre/10 px-3 py-2 text-sm">
                <p>
                  <s className="text-muted">{c.original}</s> → <b>{c.corrected}</b>
                </p>
                <p className="text-muted">{c.explanation_pt} <span className="text-xs">(foi para a revisão)</span></p>
              </div>
            ))}
          </div>
        ))}
        {busy && <p className="animate-pulse text-sm text-muted">digitando…</p>}
        <div ref={bottom} />
      </div>

      <ErrorBox>{error}</ErrorBox>

      <form onSubmit={submit} className="sticky bottom-20 mt-4 flex gap-2 rounded-2xl border border-line bg-bg p-2">
        {canListen &&
          (recording ? (
            <button type="button" className="btn bg-danger text-white" onClick={recording}>■</button>
          ) : (
            <button type="button" className="btn-primary" onClick={talk} disabled={busy} aria-label="Falar">🎙️</button>
          ))}
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva ou fale…" disabled={busy} />
        <button className="btn-ghost" disabled={busy || !text.trim()}>Enviar</button>
      </form>

      <button
        className={`mt-3 ${done ? "btn-ghost" : "btn-primary"}`}
        disabled={done || messages.length < 3}
        onClick={async () => {
          await finish();
          setDone(true);
        }}
      >
        {done ? "✓ Bloco concluído" : "Concluir bloco"}
      </button>
    </div>
  );
}
