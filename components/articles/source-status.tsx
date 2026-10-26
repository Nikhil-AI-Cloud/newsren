import { categoryLabel } from "@/lib/categories";
import { formatDateTime } from "@/lib/format";
import type { FeedStatus } from "@/types";

const STATE_LABEL: Record<FeedStatus["state"], string> = {
  ok: "Reporting",
  stale: "Showing older items",
  failed: "Unavailable",
};

export function SourceStatus({
  statuses,
  refreshedAt,
}: {
  statuses: FeedStatus[];
  refreshedAt: string | null;
}) {
  if (statuses.length === 0) return null;
  const problems = statuses.filter((s) => s.state !== "ok");
  const current = statuses.filter((s) => s.state === "ok").length;
  const stale = statuses.filter((s) => s.state === "stale").length;
  const failed = statuses.filter((s) => s.state === "failed").length;

  return (
    <section aria-label="Source status" className="space-y-3">
      {problems.length > 0 && (
        <div role="status" className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
          <p className="font-semibold">
            {problems.length} of {statuses.length} sources had a problem on the latest refresh.
          </p>
          <ul className="mt-1 list-disc pl-5 text-muted">
            {problems.map((s) => (
              <li key={s.sourceId}>
                {s.name} ({categoryLabel(s.category)}): {STATE_LABEL[s.state].toLowerCase()}
                {s.state === "stale" && s.retrievedAt ? `, last retrieved ${formatDateTime(s.retrievedAt)}` : ""}
                {s.error ? ` — ${s.error}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      <details className="rounded-lg border border-line bg-card px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">
          Sources: {current} of {statuses.length} up to date
          {stale > 0 ? ` · ${stale} showing older items` : ""}
          {failed > 0 ? ` · ${failed} unavailable` : ""}
          {refreshedAt ? ` · refreshed ${formatDateTime(refreshedAt)}` : ""}
        </summary>
        <ul className="mt-3 grid gap-x-6 gap-y-1 text-muted sm:grid-cols-2">
          {statuses.map((s) => (
            <li key={s.sourceId} className="flex justify-between gap-3">
              <span>
                {s.name} <span className="text-xs">({categoryLabel(s.category)})</span>
              </span>
              <span className={s.state === "ok" ? "" : "font-medium text-danger"}>
                {STATE_LABEL[s.state]} · {s.itemCount}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
