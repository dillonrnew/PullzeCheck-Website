// src/components/tourneyDetails/utils.ts

export function coerceSingle<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null;
  return Array.isArray(val) ? (val[0] ?? null) : val;
}

export function uniqNonNull(arr: Array<string | null | undefined>): string[] {
  const s = new Set<string>();
  for (const v of arr) if (v) s.add(v);
  return Array.from(s);
}

export function shortId(id: string) {
  return id.slice(0, 8);
}

export function fmtPoints(n: any) {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return "0";
  const rounded = Math.round(num * 10) / 10;
  const isInt = Math.abs(rounded - Math.round(rounded)) < 1e-9;
  return isInt ? String(Math.round(rounded)) : rounded.toFixed(1);
}
