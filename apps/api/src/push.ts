import { currentStreak, isoDate, LANGUAGES, lastNDays, type LangCode } from "@passaporte/shared";
import webpush, { WebPushError, type PushSubscription } from "web-push";
import { bool, db, fromJson } from "./db/knex.ts";

// ---------- Chaves VAPID ----------

let publicKey = "";

/** Usa as chaves do .env; se não houver, gera uma vez e guarda no banco (zero configuração). */
export async function initPush() {
  let pub = process.env.VAPID_PUBLIC_KEY;
  let priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    const stored = await db("app_settings").where({ key: "vapid" }).first();
    if (stored) ({ publicKey: pub, privateKey: priv } = fromJson(stored.value, { publicKey: "", privateKey: "" }));
    else {
      const keys = webpush.generateVAPIDKeys();
      await db("app_settings").insert({ key: "vapid", value: JSON.stringify(keys) });
      ({ publicKey: pub, privateKey: priv } = keys);
    }
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:passaporte@example.com", pub!, priv!);
  publicKey = pub!;
}

export const vapidPublicKey = () => publicKey;

// ---------- Envio ----------

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Envia para todos os aparelhos do membro; remove inscrições que expiraram. Devolve quantos receberam. */
export async function sendToMember(memberId: number, payload: PushPayload) {
  const subs = await db("push_subscriptions").where({ member_id: memberId });
  let sent = 0;
  for (const s of subs) {
    const subscription: PushSubscription = { endpoint: s.endpoint, keys: fromJson(s.keys, { p256dh: "", auth: "" }) };
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 4 * 3600, urgency: "normal" });
      sent++;
    } catch (err) {
      if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
        await db("push_subscriptions").where({ id: s.id }).del();
      } else console.error("Falha ao enviar push:", err);
    }
  }
  return sent;
}

// ---------- Texto do lembrete ----------

const practiced = (c: { did_input: unknown; did_speak: unknown; did_family: unknown } | undefined) =>
  Boolean(c && (bool(c.did_input) || bool(c.did_speak) || bool(c.did_family)));

export async function buildReminder(memberId: number): Promise<PushPayload | null> {
  const today = isoDate();
  const member = await db("members").where({ id: memberId }).first("id", "family_id", "name", "active_lang");
  if (!member) return null;

  const family = await db("members").where({ family_id: member.family_id }).select("id", "name");
  const checkins = await db("checkins").whereIn("member_id", family.map((m) => m.id)).andWhere("date", ">=", lastNDays(120)[0]);
  if (practiced(checkins.find((c) => c.member_id === memberId && c.date === today))) return null; // já praticou hoje

  const streak = currentStreak(checkins.filter((c) => c.member_id === memberId && practiced(c)).map((c) => c.date));
  const others = family.filter((m) => m.id !== memberId && practiced(checkins.find((c) => c.member_id === m.id && c.date === today))).map((m) => m.name);
  const due = await db("cards")
    .where({ member_id: memberId, lang: member.active_lang })
    .andWhere("due_at", "<=", new Date().toISOString())
    .count({ n: "*" })
    .first();

  const L = LANGUAGES[member.active_lang as LangCode] ?? LANGUAGES.en;
  const parts: string[] = [];
  if (streak > 0) parts.push(`Sua sequência de ${streak} ${streak === 1 ? "dia" : "dias"} está em jogo 🔥`);
  if (others.length) parts.push(`${others.join(others.length === 2 ? " e " : ", ")} já ${others.length === 1 ? "praticou" : "praticaram"} hoje.`);
  if (Number(due?.n)) parts.push(`${due!.n} cartões esperando revisão.`);
  if (!parts.length) parts.push("35 minutos hoje valem mais que 3 horas no fim de semana.");

  return { title: `${L.flag} Hora do Passaporte, ${member.name}!`, body: parts.join(" "), url: "/", tag: `reminder-${today}` };
}

// ---------- Agendador ----------

/** Não manda lembrete atrasado depois deste horário (ex.: servidor ficou fora do ar). */
const LATEST = "22:30";

export async function runReminderTick(now = new Date()) {
  const today = isoDate(now);
  const hhmm = now.toTimeString().slice(0, 5);
  const due = await db("push_subscriptions")
    .where("remind_at", "<=", hhmm)
    .andWhere((q) => q.whereNull("last_sent").orWhere("last_sent", "<>", today))
    .distinct("member_id");

  for (const { member_id } of due) {
    // marca antes de enviar: se o envio demorar, o próximo minuto não duplica
    await db("push_subscriptions").where({ member_id }).update({ last_sent: today });
    if (hhmm > LATEST) continue;
    const payload = await buildReminder(member_id);
    if (payload) await sendToMember(member_id, payload);
  }
}

export function startReminderScheduler() {
  const tick = () => runReminderTick().catch((e) => console.error("Erro no agendador de lembretes:", e));
  setInterval(tick, 60_000);
  tick();
}
