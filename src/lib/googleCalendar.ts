import { google } from "googleapis";
import type { CalendarEvent } from "./types";

export type { CalendarEvent };

/**
 * Fetches events across all of the user's calendars for the given window,
 * merged and sorted by start time.
 */
export async function fetchEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth });

  const calendarList = await calendar.calendarList.list();
  const calendars = (calendarList.data.items ?? []).filter((c) => c.selected !== false);

  const results = await Promise.all(
    calendars.map(async (cal) => {
      if (!cal.id) return [];
      const res = await calendar.events.list({
        calendarId: cal.id,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 50,
      });

      return (res.data.items ?? []).map((event): CalendarEvent => ({
        id: `${cal.id}:${event.id}`,
        title: event.summary?.trim() || "(untitled event)",
        start: event.start?.dateTime ?? event.start?.date ?? null,
        end: event.end?.dateTime ?? event.end?.date ?? null,
        allDay: Boolean(event.start?.date && !event.start?.dateTime),
        location: event.location ?? undefined,
        description: event.description ?? undefined,
        calendar: cal.summary ?? "Calendar",
      }));
    })
  );

  return results
    .flat()
    .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
}
