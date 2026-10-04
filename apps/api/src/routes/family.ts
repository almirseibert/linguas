import { currentStreak, isoDate, lastNDays } from "@passaporte/shared";
import { Router } from "express";
import { z } from "zod";
import { providerStatus } from "../ai/index.ts";
import { bool, db } from "../db/knex.ts";
import { setCheckin } from "../learning.ts";

export const familyRouter = Router();

/** Progresso de todos: selos dos últimos 7 dias, sequência e estatísticas. */
familyRouter.get("/overview", async (req, res) => {
  const familyId = req.member!.family_id;
  const days = lastNDays(7);
  const members = await db("members").where({ family_id: familyId }).select("id", "name", "avatar_color", "active_lang");
  const ids = members.map((m) => m.id);
  const checkins = await db("checkins").whereIn("member_id", ids).andWhere("date", ">=", lastNDays(400)[0]);
  const langs = await db("member_languages").whereIn("member_id", ids).select("member_id", "lang", "phase");

  const active = (c: { did_input: unknown; did_speak: unknown; did_family: unknown }) =>
    bool(c.did_input) || bool(c.did_speak) || bool(c.did_family);

  const result = members.map((m) => {
    const mine = checkins.filter((c) => c.member_id === m.id);
    const activeDates = mine.filter(active).map((c) => c.date);
    return {
      ...m,
      languages: langs.filter((l) => l.member_id === m.id).map(({ lang, phase }) => ({ lang, phase })),
      streak: currentStreak(activeDates),
      week: days.map((date) => {
        const c = mine.find((x) => x.date === date);
        return { date, input: bool(c?.did_input), speak: bool(c?.did_speak), family: bool(c?.did_family) };
      }),
    };
  });

  const weekCheckins = checkins.filter((c) => c.date >= days[0] && active(c)).length;
  res.json({
    days,
    members: result,
    stats: {
      weekCheckins,
      bestStreak: Math.max(0, ...result.map((r) => r.streak)),
      activeToday: result.filter((r) => r.week[6].input || r.week[6].speak || r.week[6].family).length,
      total: result.length,
    },
  });
});

/** Check-in manual (principalmente a "noite de idiomas" em família). */
familyRouter.put("/checkin", async (req, res) => {
  const body = z
    .object({ did_input: z.boolean().optional(), did_speak: z.boolean().optional(), did_family: z.boolean().optional() })
    .parse(req.body);
  await setCheckin(req.member!.id, isoDate(), body);
  res.json({ ok: true });
});

familyRouter.get("/log", async (req, res) => {
  const rows = await db("family_log as l")
    .join("members as m", "m.id", "l.member_id")
    .where({ "l.family_id": req.member!.family_id })
    .orderBy("l.id", "desc")
    .limit(100)
    .select("l.id", "l.note", "l.lang", "l.date", "m.name", "m.avatar_color");
  res.json(rows);
});

familyRouter.post("/log", async (req, res) => {
  const { note, lang } = z.object({ note: z.string().trim().min(1).max(1000), lang: z.string().optional() }).parse(req.body);
  await db("family_log").insert({ family_id: req.member!.family_id, member_id: req.member!.id, note, lang: lang ?? null, date: isoDate() });
  res.status(201).json({ ok: true });
});

familyRouter.get("/settings", async (req, res) => {
  const family = await db("families").where({ id: req.member!.family_id }).first("ai_provider");
  res.json({ ai_provider: family.ai_provider, providers: providerStatus() });
});

familyRouter.put("/settings", async (req, res) => {
  const { ai_provider } = z.object({ ai_provider: z.enum(["claude", "gemini"]) }).parse(req.body);
  await db("families").where({ id: req.member!.family_id }).update({ ai_provider });
  res.json({ ok: true });
});
