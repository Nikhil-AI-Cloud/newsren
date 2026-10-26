import type { ReactNode } from "react";

export function NotConnectedBadge({ label = "Not connected yet" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-paper px-2 py-0.5 text-xs font-medium text-muted">
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-card px-6 py-12 text-center">
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We could not load this content. Please try again.",
  onRetry,
  children,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-6 py-10 text-center">
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-muted">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90"
        >
          Try again
        </button>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-line/70 ${className}`} />;
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-8">
      <span className="sr-only">{label}…</span>
      <div className="space-y-3">
        <Bar className="h-4 w-24" />
        <Bar className="h-9 w-3/4" />
        <Bar className="h-4 w-full max-w-xl" />
        <Bar className="h-4 w-2/3 max-w-lg" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3 rounded-lg border border-line bg-card p-5">
            <Bar className="h-3 w-20" />
            <Bar className="h-6 w-5/6" />
            <Bar className="h-3 w-full" />
            <Bar className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
