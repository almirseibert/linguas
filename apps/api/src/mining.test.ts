import { describe, expect, it } from "vitest";
import { selectIPlusOne } from "./mining.ts";

const rank = new Map([["the", 1], ["is", 2], ["house", 300], ["big", 400], ["garden", 900], ["lovely", 2000], ["tom", 150]]);
const known = new Set(["the", "is", "my", "very"]);

describe("selectIPlusOne", () => {
  it("só aceita frases com exatamente uma palavra desconhecida, mais frequente primeiro", () => {
    const picks = selectIPlusOne(
      [
        { id: 1, text: "The garden is lovely.", pt: "" }, // 2 desconhecidas
        { id: 2, text: "My garden is very big!", pt: "" }, // garden + big
        { id: 3, text: "The garden is my garden.", pt: "" }, // só garden
        { id: 4, text: "The house is very big.", pt: "" }, // house + big
        { id: 5, text: "My house is the house.", pt: "" }, // só house
      ],
      known,
      rank,
      new Set(),
      5,
    );
    expect(picks.map((p) => [p.id, p.target])).toEqual([[5, "house"], [3, "garden"]]);
  });

  it("ignora nomes próprios/cognatos e palavras fora da lista de frequência", () => {
    const picks = selectIPlusOne(
      [
        { id: 1, text: "Tom is my very.", pt: "" },
        { id: 2, text: "The xyzzy is my.", pt: "" },
      ],
      known,
      rank,
      new Set(["tom"]),
      5,
    );
    expect(picks).toEqual([]);
  });

  it("usa uma frase por palavra-alvo e respeita o limite", () => {
    const picks = selectIPlusOne(
      [
        { id: 1, text: "The house is my.", pt: "" },
        { id: 2, text: "My house is the.", pt: "" },
        { id: 3, text: "The garden is my.", pt: "" },
      ],
      known,
      rank,
      new Set(),
      1,
    );
    expect(picks.map((p) => p.id)).toEqual([1]);
  });
});
