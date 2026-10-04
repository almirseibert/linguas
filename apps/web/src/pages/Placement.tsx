import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorBox, PageTitle, Spinner } from "../components/ui.tsx";
import { api } from "../lib/api.ts";
import { useApi, useSession } from "../lib/session.tsx";

interface Band {
  from: number;
  to: number;
  words: string[];
}

export function Placement() {
  const { refresh } = useSession();
  const navigate = useNavigate();
  const { data, error } = useApi<{ bands: Band[] }>("/study/placement");
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<number | null>(null);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!data) return <Spinner />;

  const toggle = (w: string) =>
    setKnown((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });

  async function submit() {
    const bands = data!.bands.map((b) => ({ from: b.from, to: b.to, shown: b.words, known: b.words.filter((w) => known.has(w)) }));
    const r = await api<{ estVocab: number }>("/study/placement", { body: { bands } });
    setResult(r.estVocab);
    await refresh();
  }

  if (result != null) {
    return (
      <div>
        <PageTitle title="Nivelamento" />
        <div className="card text-center">
          <p className="text-sm text-muted">Vocabulário estimado</p>
          <p className="font-mono text-5xl text-leaf">{result}</p>
          <p className="mt-2 text-muted">palavras. Os textos e a conversa vão partir daqui.</p>
          <button className="btn-primary mt-4" onClick={() => navigate("/")}>Começar</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageTitle title="Nivelamento" subtitle="Toque só nas palavras que você sabe o significado com certeza. Seja honesto — é para o seu bem!" />
      <div className="card">
        <div className="flex flex-wrap gap-2">
          {data.bands.flatMap((b) => b.words).map((w) => (
            <button key={w} onClick={() => toggle(w)} className={`rounded-xl border px-3 py-1.5 font-bold ${known.has(w) ? "border-leaf bg-leaf text-white" : "border-line"}`}>
              {w}
            </button>
          ))}
        </div>
      </div>
      <button className="btn-primary mt-4 w-full" onClick={submit}>
        Pronto ({known.size} marcadas)
      </button>
    </div>
  );
}
