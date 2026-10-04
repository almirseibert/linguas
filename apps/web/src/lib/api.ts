export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Erro ${res.status}`, res.status);
  return data as T;
}

// ---------- Tipos das respostas ----------

export interface Me {
  member: { id: number; family_id: number; name: string; avatar_color: string; active_lang: "en" | "es"; ai_provider: string | null };
  family: { name: string; invite_code: string; ai_provider: string };
  languages: { lang: "en" | "es"; phase: number; est_vocab: number; placement_done: number | boolean }[];
}

export interface Today {
  lang: "en" | "es";
  phase: number;
  vocab: number;
  dueCards: number;
  date: string;
  blocks: { block: Block; target: number; done: boolean; minutes: number }[];
  checkin: { did_input: boolean; did_speak: boolean; did_family: boolean };
}

export type Block = "review" | "input" | "shadow" | "talk";

export interface AudioCredit {
  author: string;
  license: string;
  url: string | null;
  sentence: string;
}

export interface DueCard {
  id: number;
  front: string;
  back: string;
  focus: string | null;
  source: string;
  state: number;
  intervals: Record<string, string>;
  audio: string | null;
  credit: AudioCredit | null;
}

export interface ShadowSentence {
  id: number;
  text: string;
  pt: string;
  coverage: number;
  audio: string | null;
  credit: AudioCredit | null;
}

export interface ContentItem {
  id: number;
  phase: number;
  type: "phrase" | "text";
  category: string | null;
  content: string;
  content_pt: string | null;
}

export const completeBlock = (block: Block, minutes: number) => api<Today>("/study/block", { body: { block, minutes } });
