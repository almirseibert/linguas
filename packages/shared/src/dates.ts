/** Data local no formato YYYY-MM-DD. */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return isoDate(new Date(y, m - 1, d + delta));
}

export function lastNDays(n: number, today = isoDate()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

/**
 * Sequência de dias seguidos com atividade, terminando hoje
 * (ou ontem, se hoje ainda não teve atividade — a sequência ainda está "viva").
 */
export function currentStreak(activeDates: Iterable<string>, today = isoDate()): number {
  const set = new Set(activeDates);
  let day = set.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(day)) { streak++; day = addDays(day, -1); }
  return streak;
}
