const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

function toDate(iso: string): Date {
  return new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
}

/** Formats an ISO date or timestamp (as a UTC calendar date) identically on server and client. */
export function formatDate(iso: string): string {
  const d = toDate(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFormat.format(d);
}

export function formatDateTime(iso: string): string {
  const d = toDate(iso);
  return Number.isNaN(d.getTime()) ? iso : dateTimeFormat.format(d);
}
