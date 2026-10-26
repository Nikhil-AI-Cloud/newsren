"use client";

export function ReloadButton({ label = "Reload" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90"
    >
      {label}
    </button>
  );
}
