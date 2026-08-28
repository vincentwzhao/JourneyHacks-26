"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task } from "@/lib/types";

const SEEN_KEY = "morning-brief:last-shown-date";

function todayKey(now: Date) {
  return now.toISOString().slice(0, 10);
}

function formatTime(iso: string | null, allDay: boolean) {
  if (!iso || allDay) return "All day";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function notify(urgentCount: number, importantCount: number) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (urgentCount === 0 && importantCount === 0) return;

  const parts = [];
  if (urgentCount > 0) parts.push(`${urgentCount} urgent`);
  if (importantCount > 0) parts.push(`${importantCount} important`);

  new Notification("Good morning ☀️", {
    body: `You have ${parts.join(" and ")} thing${
      urgentCount + importantCount === 1 ? "" : "s"
    } today.`,
    silent: true,
    tag: "morning-brief",
  });
}

function TaskRow({ task }: { task: Task }) {
  return (
    <li className="rounded-lg border border-black/5 bg-white/70 px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{task.title}</span>
        <span className="shrink-0 text-xs text-black/50 dark:text-white/50">
          {formatTime(task.start, task.allDay)}
        </span>
      </div>
      {task.location && (
        <div className="mt-0.5 truncate text-xs text-black/50 dark:text-white/50">
          {task.location}
        </div>
      )}
      {task.urgent && task.important && (
        <span className="mt-1 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
          Urgent &amp; Important
        </span>
      )}
    </li>
  );
}

export function MorningBrief() {
  // Auto-open once per day (your "just woke up" nudge); the user can then
  // collapse it back to an edge tab whenever they like.
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SEEN_KEY) !== todayKey(new Date());
  });
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/calendar/events");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled) setTasks(data.tasks as Task[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const { urgent, important } = useMemo(() => {
    const list = tasks ?? [];
    return {
      urgent: list.filter((t) => t.urgent),
      important: list.filter((t) => t.important && !t.urgent),
    };
  }, [tasks]);

  // Mark today as "seen" so the auto-open nudge only fires once per day.
  useEffect(() => {
    window.localStorage.setItem(SEEN_KEY, todayKey(new Date()));
  }, []);

  // Fire a quiet system notification once results are in.
  useEffect(() => {
    if (!tasks || typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "default") {
      Notification.requestPermission().then(() => {
        notify(urgent.length, important.length);
      });
    } else {
      notify(urgent.length, important.length);
    }
  }, [tasks, urgent.length, important.length]);

  const totalCount = urgent.length + important.length;

  return (
    <div
      className={`fixed top-0 right-0 z-50 flex h-full items-start transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "translate-x-[calc(100%-2.75rem)]"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Collapse morning brief" : "Open morning brief"}
        className="relative mt-6 flex h-11 w-11 shrink-0 items-center justify-center rounded-l-xl border border-r-0 border-black/10 bg-white text-lg shadow-md dark:border-white/10 dark:bg-neutral-900"
      >
        <span aria-hidden>🌅</span>
        {!open && totalCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-semibold text-white">
            {totalCount}
          </span>
        )}
      </button>

      <aside className="h-full w-80 max-w-[85vw] overflow-y-auto border-l border-black/10 bg-white/95 p-5 shadow-xl backdrop-blur dark:border-white/10 dark:bg-neutral-900/95">
        <header className="mb-4">
          <h2 className="text-lg font-semibold">Morning brief</h2>
          <p className="text-xs text-black/50 dark:text-white/50">
            Pulled from your Google Calendar, sorted by what actually needs you today.
          </p>
        </header>

        {loading && <p className="text-sm text-black/50 dark:text-white/50">Loading today&apos;s tasks…</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {!loading && !error && totalCount === 0 && (
          <p className="text-sm text-black/50 dark:text-white/50">
            Nothing urgent or important on today&apos;s calendar. 🎉
          </p>
        )}

        {urgent.length > 0 && (
          <section className="mb-5">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
              🔴 Urgent
            </h3>
            <ul className="flex flex-col gap-2">
              {urgent.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          </section>
        )}

        {important.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
              🟡 Important
            </h3>
            <ul className="flex flex-col gap-2">
              {important.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
