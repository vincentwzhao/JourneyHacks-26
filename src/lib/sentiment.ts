export type SentimentLabel =
  | "very_negative"
  | "negative"
  | "neutral"
  | "positive"
  | "very_positive";

export interface SentimentResult {
  label: SentimentLabel;
  score: number; // -1 (very negative) to 1 (very positive)
  insight: string; // one-sentence reflection back to the student
}

export interface MoodEntry {
  id: string;
  text: string;
  createdAt: string; // ISO timestamp
  sentiment: SentimentResult;
}

export const SENTIMENT_LABELS: SentimentLabel[] = [
  "very_negative",
  "negative",
  "neutral",
  "positive",
  "very_positive",
];

export const SENTIMENT_META: Record<
  SentimentLabel,
  { emoji: string; text: string; bar: string }
> = {
  very_negative: { emoji: "😞", text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500" },
  negative: { emoji: "🙁", text: "text-orange-600 dark:text-orange-400", bar: "bg-orange-500" },
  neutral: { emoji: "😐", text: "text-slate-600 dark:text-slate-300", bar: "bg-slate-400" },
  positive: { emoji: "🙂", text: "text-lime-600 dark:text-lime-400", bar: "bg-lime-500" },
  very_positive: { emoji: "😄", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
};

const STORAGE_KEY = "journeyhacks:sentiment-entries";

export function loadEntries(): MoodEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: MoodEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
