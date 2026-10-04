/** Tokeniza texto em palavras minúsculas (mantém acentos e ñ). */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/\p{L}+(?:['’]\p{L}+)*/gu) ?? []).map((w) => w.replace(/’/g, "'"));
}

/**
 * Cobertura lexical: fração das palavras do texto que a pessoa já conhece.
 * Input compreensível pede ~95%+ (Krashen / Nation).
 */
export function coverage(text: string, known: Set<string>): { ratio: number; unknown: string[] } {
  const tokens = tokenize(text);
  if (tokens.length === 0) return { ratio: 1, unknown: [] };
  const unknown = new Set<string>();
  let hits = 0;
  for (const t of tokens) {
    if (known.has(t) || /^\d+$/.test(t)) hits++;
    else unknown.add(t);
  }
  return { ratio: hits / tokens.length, unknown: [...unknown] };
}

/** Similaridade palavra-a-palavra (para shadowing): LCS sobre tokens. */
export function wordDiff(expected: string, heard: string) {
  const a = tokenize(expected);
  const b = tokenize(heard);
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const words: { word: string; ok: boolean }[] = [];
  let i = 0, j = 0;
  while (i < a.length) {
    if (j < b.length && a[i] === b[j]) { words.push({ word: a[i], ok: true }); i++; j++; }
    else if (j < b.length && dp[i][j + 1] >= dp[i + 1][j]) j++;
    else { words.push({ word: a[i], ok: false }); i++; }
  }
  const score = a.length ? Math.round((dp[0][0] / a.length) * 100) : 0;
  return { score, words };
}
