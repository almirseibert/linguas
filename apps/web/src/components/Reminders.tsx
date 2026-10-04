import { useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { currentSubscription, disableReminders, enableReminders, isIos, isStandalone, pushSupported, type PushStatus } from "../lib/push.ts";
import { useApi } from "../lib/session.tsx";
import { ErrorBox } from "./ui.tsx";

export function Reminders() {
  const status = useApi<PushStatus>("/push");
  const [thisDevice, setThisDevice] = useState<boolean | null>(null);
  const [time, setTime] = useState("19:00");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status.data) setTime(status.data.remind_at);
  }, [status.data]);

  useEffect(() => {
    void currentSubscription().then((sub) => setThisDevice(Boolean(sub && status.data?.endpoints.includes(sub.endpoint))));
  }, [status.data]);

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg(ok);
      await status.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!pushSupported) {
    return (
      <section className="card space-y-2">
        <p className="font-bold">🔔 Lembrete diário</p>
        <p className="text-sm text-muted">
          {isIos && !isStandalone
            ? "No iPhone: toque em Compartilhar → “Adicionar à Tela de Início”, abra o app por lá e volte aqui para ativar."
            : "Este navegador não suporta notificações. Use o Chrome, Edge ou Safari atualizado."}
        </p>
      </section>
    );
  }

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">🔔 Lembrete diário</p>
        <span className={`text-xs font-bold ${thisDevice ? "text-leaf" : "text-muted"}`}>
          {thisDevice ? "ativo neste aparelho" : "desativado neste aparelho"}
        </span>
      </div>
      <p className="text-sm text-muted">
        Só chega se você ainda não praticou no dia — e conta quem da família já fez. Chega em todos os aparelhos onde você ativar.
      </p>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="label" htmlFor="remind">Horário</label>
          <input id="remind" type="time" className="input font-mono" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        {thisDevice && time !== status.data?.remind_at && (
          <button className="btn-primary" disabled={busy} onClick={() => run(() => api("/push/time", { method: "PUT", body: { remind_at: time } }), "Horário salvo.")}>
            Salvar
          </button>
        )}
      </div>

      {thisDevice ? (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" disabled={busy} onClick={() => run(() => api("/push/test", { body: {} }), "Enviado! Deve aparecer em instantes.")}>
            Enviar teste
          </button>
          <button className="btn-ghost" disabled={busy} onClick={() => run(disableReminders, "Lembretes desativados neste aparelho.")}>
            Desativar
          </button>
        </div>
      ) : (
        <button className="btn-primary w-full" disabled={busy || !status.data} onClick={() => run(() => enableReminders(status.data!.publicKey, time), "Pronto! Lembrete ativado.")}>
          Ativar lembrete neste aparelho
        </button>
      )}

      {isIos && !isStandalone && <p className="text-xs text-muted">No iPhone, o lembrete só funciona com o app instalado na Tela de Início.</p>}
      {msg && <p className="text-sm text-leaf">{msg}</p>}
      <ErrorBox>{error}</ErrorBox>
    </section>
  );
}
