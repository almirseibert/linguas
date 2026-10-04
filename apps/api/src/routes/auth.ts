import { isLang, LANG_CODES } from "@passaporte/shared";
import { Router } from "express";
import { z } from "zod";
import { checkPin, endSession, hashPin, newInviteCode, requireMember, startSession } from "../auth.ts";
import { db, insertId } from "../db/knex.ts";
import { ensureLanguage } from "../learning.ts";

export const authRouter = Router();

const COLORS = ["#2F6F4E", "#C97C1D", "#3B6EA8", "#A8443B", "#7B4FA0", "#2D8C8C"];

const MemberInput = z.object({
  memberName: z.string().trim().min(1).max(80),
  pin: z.string().regex(/^\d{4}$/, "PIN deve ter 4 dígitos"),
  lang: z.enum(LANG_CODES as ["en", "es"]).default("en"),
});

async function createMember(familyId: number, input: z.infer<typeof MemberInput>) {
  const count = await db("members").where({ family_id: familyId }).count({ n: "*" }).first();
  const id = await insertId(
    db("members").insert({
      family_id: familyId,
      name: input.memberName,
      pin_hash: await hashPin(input.pin),
      avatar_color: COLORS[Number(count?.n ?? 0) % COLORS.length],
      active_lang: input.lang,
    }),
  );
  await ensureLanguage(id, input.lang);
  return id;
}

/** Cria uma família nova com o primeiro membro. */
authRouter.post("/families", async (req, res) => {
  const body = MemberInput.extend({ familyName: z.string().trim().min(1).max(120) }).parse(req.body);
  const invite_code = newInviteCode();
  const familyId = await insertId(
    db("families").insert({ name: body.familyName, invite_code, ai_provider: process.env.AI_DEFAULT_PROVIDER ?? "claude" }),
  );
  const memberId = await createMember(familyId, body);
  await startSession(res, memberId, familyId);
  res.status(201).json({ invite_code });
});

/** Tela de login: nome da família e lista de membros a partir do código. */
authRouter.get("/families/:code", async (req, res) => {
  const family = await db("families").where({ invite_code: req.params.code.toUpperCase() }).first("id", "name");
  if (!family) return res.status(404).json({ error: "Código de família não encontrado." });
  const members = await db("members").where({ family_id: family.id }).select("id", "name", "avatar_color");
  res.json({ name: family.name, members });
});

/** Entra numa família existente como membro novo. */
authRouter.post("/families/:code/join", async (req, res) => {
  const body = MemberInput.parse(req.body);
  const family = await db("families").where({ invite_code: req.params.code.toUpperCase() }).first("id");
  if (!family) return res.status(404).json({ error: "Código de família não encontrado." });
  const taken = await db("members").where({ family_id: family.id }).whereRaw("lower(name) = ?", [body.memberName.toLowerCase()]).first();
  if (taken) return res.status(409).json({ error: "Já existe alguém com esse nome na família. Use 'Entrar'." });
  const memberId = await createMember(family.id, body);
  await startSession(res, memberId, family.id);
  res.status(201).json({ ok: true });
});

authRouter.post("/login", async (req, res) => {
  const body = z.object({ code: z.string(), memberId: z.number().int(), pin: z.string() }).parse(req.body);
  const member = await db("members as m")
    .join("families as f", "f.id", "m.family_id")
    .where({ "m.id": body.memberId, "f.invite_code": body.code.toUpperCase() })
    .first("m.id", "m.family_id", "m.pin_hash");
  if (!member || !(await checkPin(body.pin, member.pin_hash))) return res.status(401).json({ error: "PIN incorreto." });
  await startSession(res, member.id, member.family_id);
  res.json({ ok: true });
});

authRouter.post("/logout", (_req, res) => {
  endSession(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireMember, async (req, res) => {
  const m = req.member!;
  const family = await db("families").where({ id: m.family_id }).first("name", "invite_code", "ai_provider");
  const languages = await db("member_languages").where({ member_id: m.id }).select("lang", "phase", "est_vocab", "placement_done");
  res.json({ member: m, family, languages });
});

authRouter.put("/me", requireMember, async (req, res) => {
  const body = z
    .object({
      active_lang: z.string().optional(),
      ai_provider: z.enum(["claude", "gemini"]).nullable().optional(),
    })
    .parse(req.body);
  const patch: Record<string, unknown> = {};
  if (body.active_lang !== undefined) {
    if (!isLang(body.active_lang)) return res.status(400).json({ error: "Idioma inválido." });
    await ensureLanguage(req.member!.id, body.active_lang);
    patch.active_lang = body.active_lang;
  }
  if (body.ai_provider !== undefined) patch.ai_provider = body.ai_provider;
  if (Object.keys(patch).length) await db("members").where({ id: req.member!.id }).update(patch);
  res.json({ ok: true });
});
