import { describe, expect, it } from "vitest";
import { coverage, currentStreak, tokenize, wordDiff } from "./index.ts";

describe("tokenize", () => {
  it("mantém acentos, ñ e contrações", () => {
    expect(tokenize("¿Qué tal, señor? I don't know.")).toEqual(["qué", "tal", "señor", "i", "don't", "know"]);
  });
});

describe("coverage", () => {
  it("calcula a fração de palavras conhecidas", () => {
    const r = coverage("the cat is on the mat", new Set(["the", "cat", "is", "on"]));
    expect(r.ratio).toBeCloseTo(5 / 6);
    expect(r.unknown).toEqual(["mat"]);
  });
});

describe("currentStreak", () => {
  it("conta dias seguidos até hoje", () => {
    expect(currentStreak(["2026-10-02", "2026-10-03", "2026-10-04"], "2026-10-04")).toBe(3);
  });
  it("mantém a sequência viva se hoje ainda não teve atividade", () => {
    expect(currentStreak(["2026-10-02", "2026-10-03"], "2026-10-04")).toBe(2);
  });
  it("zera quando falhou ontem", () => {
    expect(currentStreak(["2026-10-01"], "2026-10-04")).toBe(0);
  });
});

describe("wordDiff", () => {
  it("marca palavras faltando", () => {
    const r = wordDiff("I would like a coffee please", "I like a coffee please");
    expect(r.score).toBe(83);
    expect(r.words.find((w) => w.word === "would")?.ok).toBe(false);
  });
});
