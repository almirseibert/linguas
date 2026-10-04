import { tokenize } from "@passaporte/shared";
import { useState } from "react";
import { ErrorBox, PageTitle, SpeakButton, Spinner, useBlockTimer } from "../components/ui.tsx";
import { api, type ContentItem } from "../lib/api.ts";
import { useApi, useSession } from "../lib/session.tsx";
import { speak } from "../lib/speech.ts";

interface Reading {
  title: string;
  paragraphs: string[];
  translation_pt: string[];
  glossary: { term: string; meaning_pt: string; example: string }[];
  coverage?: number;
  provider?: string;
}

interface WordInfo {
  meaning_pt: string;
  example: string;
  example_pt: string;
}

/** Frase do texto que contém a palavra (vira o cartão — sempre frase, nunca palavra solta). */
function sentenceWith(paragraphs: string[], word: string) {
  const sentences = paragraphs.join(" ").match(/[^.!?¡¿]+[.!?]+/g) ?? paragraphs;
  return sentences.find((s) => tokenize(s).includes(word))?.trim() ?? word;
}

export function Read() {
  const { speechTag } = useSession();
  const content = useApi<{ items: ContentItem[] }>("/study/content");
  const [reading, setReading] = useState<Reading | null>(null);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPt, setShowPt] = useState(false);
  const [selected, setSelected] = useState<{ word: string; info?: WordInfo; added?: boolean } | null>(null);
  const [done, setDone] = useState(false);
  const finish = useBlockTimer("input");

  async function generate() {
    setBusy(true);
    setError(null);
    setSelected(null);
    try {
      setReading(await api<Reading>("/ai/reading", { body: { topic: topic || undefined } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function openSeedText(item: ContentItem) {
    setReading({ title: item.category ?? "Texto", paragraphs: [item.content], translation_pt: [item.content_pt ?? ""], glossary: [] });
  }

  async function pickWord(word: string) {
    setSelected({ word });
    try {
      const info = await api<WordInfo>("/ai/word", { body: { word, context: reading ? sentenceWith(reading.paragraphs, word) : undefined } });
      setSelected({ word, info });
    } catch {
      // sem IA configurada: ainda dá para adicionar o cartão
    }
  }

  async function addCard() {
    if (!selected || !reading) return;
    const front = sentenceWith(reading.paragraphs, selected.word);
    const back = selected.info ? `${selected.word} = ${selected.info.meaning_pt}` : `(${selected.word})`;
    await api("/study/cards", { body: { front, back, focus: selected.word } });
    setSelected({ ...selected, added: true });
  }

  return (
    <div>
      <PageTitle title="Leitura e escuta" subtitle="Ouça primeiro, depois leia. Toque numa palavra desconhecida." />

      {!reading && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <label className="label" htmlFor="topic">Tema (opcional)</label>
            <input id="topic" className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="ex.: futebol, receitas, viagem…" />
            <button className="btn-primary w-full" onClick={generate} disabled={busy}>
              {busy ? "Escrevendo um texto no seu nível…" : "✨ Gerar texto novo com IA"}
            </button>
          </div>
          <ErrorBox>{error}</ErrorBox>
          {content.data && (
            <div className="card">
              <p className="mb-2 font-bold">Ou use um texto da sua fase</p>
              {content.data.items.filter((i) => i.type === "text").map((i) => (
                <button key={i.id} className="btn-ghost mb-2 w-full justify-start" onClick={() => openSeedText(i)}>
                  📄 {i.category}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {busy && reading && <Spinner label="Gerando…" />}

      {reading && (
        <div className="space-y-4">
          <article className="card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-extrabold">{reading.title}</h3>
              {reading.coverage != null && (
                <span className="font-mono text-xs text-muted" title="Palavras que você já conhece">{Math.round(reading.coverage * 100)}% conhecidas</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <SpeakButton label="Ouvir devagar" onClick={() => speak(reading.paragraphs.join(" "), speechTag, 0.8)} />
              <SpeakButton label="Ouvir normal" onClick={() => speak(reading.paragraphs.join(" "), speechTag, 1)} />
            </div>
            {reading.paragraphs.map((p, i) => (
              <div key={i}>
                <p className="text-lg leading-relaxed">
                  {p.split(/(\s+)/).map((chunk, j) => {
                    const word = tokenize(chunk)[0];
                    return word ? (
                      <button key={j} onClick={() => pickWord(word)} className={`rounded px-0.5 hover:bg-ochre/20 ${selected?.word === word ? "bg-ochre/30" : ""}`}>
                        {chunk}
                      </button>
                    ) : (
                      chunk
                    );
                  })}
                </p>
                {showPt && <p className="mt-1 text-sm italic text-muted">{reading.translation_pt[i]}</p>}
              </div>
            ))}
            <button className="text-sm font-bold text-muted" onClick={() => setShowPt(!showPt)}>
              {showPt ? "Esconder tradução" : "Mostrar tradução"}
            </button>
          </article>

          {selected && (
            <div className="card space-y-2 border-ochre/60">
              <p className="text-lg font-bold">{selected.word}</p>
              {selected.info ? (
                <>
                  <p>{selected.info.meaning_pt}</p>
                  <p className="text-sm text-muted">{selected.info.example} — <i>{selected.info.example_pt}</i></p>
                </>
              ) : (
                <p className="text-sm text-muted">Buscando significado…</p>
              )}
              <button className="btn-primary" onClick={addCard} disabled={selected.added}>
                {selected.added ? "✓ Adicionado à revisão" : "+ Adicionar frase à revisão"}
              </button>
            </div>
          )}

          {reading.glossary.length > 0 && (
            <div className="card">
              <p className="mb-2 font-bold">Palavras-chave</p>
              <ul className="space-y-1 text-sm">
                {reading.glossary.map((g) => (
                  <li key={g.term}>
                    <b>{g.term}</b> — {g.meaning_pt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => setReading(null)}>Outro texto</button>
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
      )}
    </div>
  );
}
