import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchEvents } from "@/lib/googleCalendar";
import { classifyTasks } from "@/lib/classify";

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (session.error) {
    return NextResponse.json({ error: session.error }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  windowStart.setDate(windowStart.getDate() - 1); // catch yesterday's overdue items too

  const windowEnd = new Date(now);
  windowEnd.setHours(23, 59, 59, 999);

  try {
    const events = await fetchEvents(session.accessToken, windowStart, windowEnd);
    const tasks = await classifyTasks(events, now);
    return NextResponse.json({ tasks, fetchedAt: now.toISOString() });
  } catch (err) {
    console.error("Failed to load calendar events", err);
    return NextResponse.json(
      { error: "Failed to load calendar events" },
      { status: 502 }
    );
  }
}
