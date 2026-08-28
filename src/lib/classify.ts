import type { CalendarEvent, Task } from "./types";

export type { Task };

const URGENT_WINDOW_HOURS = 3;

const IMPORTANT_KEYWORDS = [
  "exam",
  "midterm",
  "final",
  "interview",
  "deadline",
  "due",
  "submit",
  "presentation",
  "review",
  "appointment",
  "doctor",
  "dentist",
  "flight",
  "meeting",
  "1:1",
  "one on one",
  "assignment",
  "project",
  "defense",
  "payment",
  "rent",
  "bill",
];

function startDate(event: CalendarEvent): Date | null {
  return event.start ? new Date(event.start) : null;
}

/** Rule-based Eisenhower classification: no network calls, always available. */
export function heuristicClassify(events: CalendarEvent[], now: Date): Task[] {
  const urgentCutoff = new Date(now.getTime() + URGENT_WINDOW_HOURS * 60 * 60 * 1000);

  return events.map((event) => {
    const start = startDate(event);
    const end = event.end ? new Date(event.end) : null;
    const text = `${event.title} ${event.description ?? ""}`.toLowerCase();

    const isOverdueOrInProgress = Boolean(
      start && start <= now && (!end || end >= now)
    );
    const isStartingSoon = Boolean(start && start > now && start <= urgentCutoff);
    const urgent = !event.allDay && (isOverdueOrInProgress || isStartingSoon);

    const durationMinutes =
      start && end ? (end.getTime() - start.getTime()) / 60000 : 0;
    const important =
      IMPORTANT_KEYWORDS.some((kw) => text.includes(kw)) || durationMinutes >= 60;

    return { ...event, urgent, important };
  });
}

type GeminiVerdict = { id: string; urgent: boolean; important: boolean };

async function classifyWithGemini(
  events: CalendarEvent[],
  now: Date
): Promise<Task[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || events.length === 0) return null;

  const prompt = `You triage a student's calendar for a morning briefing using the
Eisenhower matrix. For each event decide:
- "urgent": time-critical right now (starting imminently, in progress, or overdue) -
  NOT just "later today".
- "important": meaningfully affects goals/grades/relationships/health if missed or
  poorly prepared for (exams, deadlines, interviews, appointments), as opposed to
  low-stakes/casual items.
An event can be both, neither, or just one.

Current time: ${now.toISOString()}

Events (JSON):
${JSON.stringify(
  events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    description: e.description?.slice(0, 300),
  }))
)}

Respond with ONLY a JSON array, no prose, matching this shape:
[{"id": "<event id>", "urgent": true|false, "important": true|false}, ...]`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        }),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const raw: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;

    const verdicts: GeminiVerdict[] = JSON.parse(raw);
    const byId = new Map(verdicts.map((v) => [v.id, v]));

    return events.map((event) => {
      const verdict = byId.get(event.id);
      return {
        ...event,
        urgent: verdict?.urgent ?? false,
        important: verdict?.important ?? false,
      };
    });
  } catch {
    return null;
  }
}

/** Classifies events into urgent/important, preferring Gemini and falling back to heuristics. */
export async function classifyTasks(
  events: CalendarEvent[],
  now: Date = new Date()
): Promise<Task[]> {
  const viaGemini = await classifyWithGemini(events, now);
  return viaGemini ?? heuristicClassify(events, now);
}
