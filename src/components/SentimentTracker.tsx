"use client";

import { useEffect, useState } from "react";
import {
  loadEntries,
  saveEntries,
  SENTIMENT_META,
  type MoodEntry,
} from "@/lib/sentiment";

const EXAMPLE_PLACEHOLDER =
  'e.g. "I feel like we have two lives, and the second one starts when we realize we only have one."';

export default function SentimentTracker() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reads from localStorage, which isn't available during SSR, so this
    // can't be computed during the initial render and must live in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(loadEntries());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong");
      }

      const entry: MoodEntry = {
        id: crypto.randomUUID(),
        text: trimmed,
        createdAt: new Date().toISOString(),
        sentiment: data,
      };

      const next = [entry, ...entries];
      setEntries(next);
      saveEntries(next);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze entry");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setEntries([]);
    saveEntries([]);
  }

  const trend = entries.slice(0, 20).reverse();

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="mood-entry" className="font-medium text-sm text-slate-600 dark:text-slate-300">
          How are you feeling right now?
        </label>
        <textarea
          id="mood-entry"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE_PLACEHOLDER}
          rows={4}
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex items-center justify-between gap-3">
          <button
            type="submit"
            disabled={!text.trim() || loading}
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          >
            {loading ? "Analyzing…" : "Log & analyze"}
          </button>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear history
            </button>
          )}
        </div>
        {error && <p className="text-sm text-rose-500">{error}</p>}
      </form>

      {trend.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-slate-600 dark:text-slate-300">Mood trend</h2>
          <div className="flex items-end gap-1 h-24 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            {trend.map((entry) => {
              const meta = SENTIMENT_META[entry.sentiment.label];
              const heightPct = ((entry.sentiment.score + 1) / 2) * 100;
              return (
                <div
                  key={entry.id}
                  title={`${entry.sentiment.label} (${entry.sentiment.score.toFixed(2)})`}
                  className={`flex-1 rounded-sm ${meta.bar}`}
                  style={{ height: `${Math.max(6, heightPct)}%` }}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {entries.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">
            No entries yet — log how you&apos;re feeling to get started.
          </p>
        )}
        {entries.map((entry) => {
          const meta = SENTIMENT_META[entry.sentiment.label];
          return (
            <div
              key={entry.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${meta.text}`}>
                  {meta.emoji} {entry.sentiment.label.replace("_", " ")}
                </span>
                <time className="text-xs text-slate-400" dateTime={entry.createdAt}>
                  {new Date(entry.createdAt).toLocaleString()}
                </time>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200">{entry.text}</p>
              <p className="text-xs italic text-slate-500 dark:text-slate-400">
                {entry.sentiment.insight}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
