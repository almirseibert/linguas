import { isoDate } from "@passaporte/shared";
import { Router } from "express";
import { z } from "zod";
import { db, toJson } from "../db/knex.ts";
import { buildReminder, sendToMember, vapidPublicKey } from "../push.ts";

export const pushRouter = Router();

const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido");

pushRouter.get("/", async (req, res) => {
  const subs = await db("push_subscriptions").where({ member_id: req.member!.id }).select("endpoint", "remind_at");
  res.json({ publicKey: vapidPublicKey(), devices: subs.length, remind_at: subs[0]?.remind_at ?? "19:00", endpoints: subs.map((s) => s.endpoint) });
});

pushRouter.post("/subscribe", async (req, res) => {
  const body = z
    .object({
      subscription: z.object({ endpoint: z.url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) }),
      remind_at: Time.default("19:00"),
    })
    .parse(req.body);

  const now = new Date().toTimeString().slice(0, 5);
  const row = {
    member_id: req.member!.id,
    endpoint: body.subscription.endpoint,
    keys: toJson(body.subscription.keys),
    remind_at: body.remind_at,
    // se o horário de hoje já passou, o primeiro lembrete é amanhã
    last_sent: body.remind_at <= now ? isoDate() : null,
  };
  const existing = await db("push_subscriptions").where({ endpoint: row.endpoint }).first("id");
  if (existing) await db("push_subscriptions").where({ id: existing.id }).update(row);
  else await db("push_subscriptions").insert(row);
  // todos os aparelhos da pessoa usam o mesmo horário
  await db("push_subscriptions").where({ member_id: req.member!.id }).update({ remind_at: body.remind_at });
  res.status(201).json({ ok: true });
});

pushRouter.delete("/subscribe", async (req, res) => {
  const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body);
  await db("push_subscriptions").where({ member_id: req.member!.id, endpoint }).del();
  res.json({ ok: true });
});

pushRouter.put("/time", async (req, res) => {
  const remind_at = Time.parse(req.body?.remind_at);
  const now = new Date().toTimeString().slice(0, 5);
  await db("push_subscriptions")
    .where({ member_id: req.member!.id })
    .update({ remind_at, last_sent: remind_at <= now ? isoDate() : null });
  res.json({ ok: true });
});

/** Envia agora um lembrete de teste para os aparelhos da pessoa. */
pushRouter.post("/test", async (req, res) => {
  const payload = (await buildReminder(req.member!.id)) ?? {
    title: "✅ Lembretes funcionando",
    body: "Você já praticou hoje — amanhã o lembrete chega no horário escolhido.",
    url: "/",
  };
  const sent = await sendToMember(req.member!.id, { ...payload, tag: "test" });
  if (!sent) return res.status(404).json({ error: "Nenhum aparelho inscrito recebeu. Ative os lembretes de novo neste aparelho." });
  res.json({ sent });
});
