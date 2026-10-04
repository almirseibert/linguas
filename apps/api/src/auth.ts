import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import { jwtVerify, SignJWT } from "jose";
import { db } from "./db/knex.ts";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPin(pin: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(pin, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function checkPin(pin: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  const hash = await scrypt(pin, Buffer.from(saltHex, "hex"), 32);
  return timingSafeEqual(hash, Buffer.from(hashHex, "hex"));
}

/** Código de convite legível (sem 0/O/1/I). */
export function newInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(8), (b) => alphabet[b % alphabet.length]).join("");
}

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-troque-no-env");
const COOKIE = "passaporte_session";

export async function startSession(res: Response, memberId: number, familyId: number) {
  const token = await new SignJWT({ fid: familyId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(memberId))
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(secret());
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 180 * 24 * 3600 * 1000,
  });
}

export function endSession(res: Response) {
  res.clearCookie(COOKIE);
}

export interface SessionMember {
  id: number;
  family_id: number;
  name: string;
  avatar_color: string;
  active_lang: string;
  ai_provider: string | null;
}

declare global {
  namespace Express {
    interface Request {
      member?: SessionMember;
    }
  }
}

export async function requireMember(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: "Faça login." });
  try {
    const { payload } = await jwtVerify(token, secret());
    const member = await db("members")
      .where({ id: Number(payload.sub) })
      .first("id", "family_id", "name", "avatar_color", "active_lang", "ai_provider");
    if (!member) return res.status(401).json({ error: "Sessão inválida." });
    req.member = member;
    next();
  } catch {
    res.status(401).json({ error: "Sessão expirada." });
  }
}
