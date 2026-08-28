export type CalendarEvent = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  location?: string;
  description?: string;
  calendar: string;
};

export type Task = CalendarEvent & {
  urgent: boolean;
  important: boolean;
};
