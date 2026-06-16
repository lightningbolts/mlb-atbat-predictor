import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class strings with conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a raw probability float (0–1) as a percentage string. */
export function formatProbability(value: number | undefined): string {
  const safe = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  return `${(safe * 100).toFixed(1)}%`;
}

/** Ordinal suffix for inning display (1st, 2nd, 3rd, …). */
export function formatInning(inning: number | undefined): string {
  const n = typeof inning === "number" && inning > 0 ? inning : 1;
  const suffix =
    n % 10 === 1 && n % 100 !== 11
      ? "st"
      : n % 10 === 2 && n % 100 !== 12
        ? "nd"
        : n % 10 === 3 && n % 100 !== 13
          ? "rd"
          : "th";
  return `${n}${suffix}`;
}

/** Inning half label with arrow (▲ Top / ▼ Bot). */
export function formatInningHalf(half: string | undefined): string {
  const normalized = (half ?? "").toLowerCase().replace(/\s+/g, "");
  if (normalized === "top") return "▲ Top";
  if (normalized === "bottom" || normalized === "bot") return "▼ Bot";
  if (normalized === "middle") return "— Mid";
  if (normalized === "end") return "End";
  if (half) return half;
  return "—";
}

/** Combined inning + half, e.g. "3rd ▼ Bot". */
export function formatInningDisplay(inning: number | undefined, half: string | undefined): string {
  return `${formatInning(inning)} ${formatInningHalf(half)}`.trim();
}
