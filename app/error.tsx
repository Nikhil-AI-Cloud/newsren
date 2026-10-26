"use client";

import { ErrorState } from "@/components/ui/states";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return <ErrorState onRetry={retry} />;
}
