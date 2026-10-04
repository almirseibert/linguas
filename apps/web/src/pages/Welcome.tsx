import { LANG_CODES, LANGUAGES, type LangCode } from "@passaporte/shared";
import { useState, type FormEvent } from "react";
import { ErrorBox } from "../components/ui.tsx";
import { api } from "../lib/api.ts";
import { useSession } from "../lib/session.tsx";

type Mode = "login" | "join" | "create";

interface FamilyInfo {
  name: string;
  members: { id: number; name: string; avatar_color: string }[];
}

export function Welcome() {
  const { refresh } = useSession();
  const [mode, setMode] = useState<Mode>("login");
  const [code, setCode] = useState("");
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [familyName, setFamilyName] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [lang, setLang] = useState<LangCode>("en");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
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

  const lookup = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => setFamily(await api<FamilyInfo>(`/families/${code.trim().toUpperCase()}`)));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (mode === "create") await api("/families", { body: { familyName, memberName: name, pin, lang } });
      else if (mode === "join") await api(`/families/${code.trim().toUpperCase()}/join`, { body: { memberName: name, pin, lang } });
      else await api("/login", { body: { code: code.trim(), memberId, pin } });
      await refresh();
    });
  };

  const pinField = (
    <div>
      <label className="label" htmlFor="pin">PIN de 4 dígitos</label>
      <input id="pin" className="input font-mono tracking-[0.5em]" inputMode="numeric" maxLength={4} pattern="\d{4}" required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
    </div>
  );

  const langField = (
    <div>
      <span className="label">Começar por</span>
      <div className="grid grid-cols-2 gap-2">
        {LANG_CODES.map((c) => (
          <button type="button" key={c} onClick={() => setLang(c)} className={lang === c ? "btn-primary" : "btn-ghost"}>
            {LANGUAGES[c].flag} {LANGUAGES[c].name}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">Dá para estudar os dois e trocar a qualquer momento.</p>
    </div>
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <img src="/icon.svg" alt="" className="mx-auto mb-3 h-16 w-16" />
        <h1 className="text-3xl font-extrabold">Passaporte de Idiomas</h1>
        <p className="text-muted">Inglês e espanhol em família, ~35 minutos por dia.</p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-1">
        {([["login", "Entrar"], ["join", "Entrar na família"], ["create", "Nova família"]] as const).map(([m, label]) => (
          <button key={m} onClick={() => { setMode(m); setError(null); }} className={`rounded-lg px-2 py-2 text-sm font-bold ${mode === m ? "bg-leaf text-white" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="card space-y-4">
        {mode !== "create" && !family && (
          <form onSubmit={lookup} className="space-y-3">
            <label className="label" htmlFor="code">Código da família</label>
            <input id="code" className="input font-mono uppercase" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="EX: K7P2QH9M" />
            <button className="btn-primary w-full" disabled={busy}>Continuar</button>
          </form>
        )}

        {mode === "login" && family && (
          <form onSubmit={submit} className="space-y-4">
            <p className="font-bold">{family.name} — quem é você?</p>
            <div className="flex flex-wrap gap-2">
              {family.members.map((m) => (
                <button type="button" key={m.id} onClick={() => setMemberId(m.id)} className={memberId === m.id ? "btn-primary" : "btn-ghost"}>
                  <span className="h-3 w-3 rounded-full" style={{ background: m.avatar_color }} /> {m.name}
                </button>
              ))}
            </div>
            {memberId && pinField}
            <button className="btn-primary w-full" disabled={busy || !memberId}>Entrar</button>
          </form>
        )}

        {mode === "join" && family && (
          <form onSubmit={submit} className="space-y-4">
            <p className="font-bold">Entrando em: {family.name}</p>
            <div>
              <label className="label" htmlFor="name">Seu nome</label>
              <input id="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {pinField}
            {langField}
            <button className="btn-primary w-full" disabled={busy}>Criar meu perfil</button>
          </form>
        )}

        {mode === "create" && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="fam">Nome da família</label>
              <input id="fam" className="input" required value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Família Seibert" />
            </div>
            <div>
              <label className="label" htmlFor="name2">Seu nome</label>
              <input id="name2" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {pinField}
            {langField}
            <button className="btn-primary w-full" disabled={busy}>Criar família</button>
          </form>
        )}

        <ErrorBox>{error}</ErrorBox>
        {family && mode !== "create" && (
          <button className="text-sm font-bold text-muted" onClick={() => { setFamily(null); setMemberId(null); }}>
            ← Outro código
          </button>
        )}
      </div>
    </div>
  );
}
