import Link from "next/link";
import { EmptyState } from "@/components/ui/states";

export default function NotFound() {
  return (
    <EmptyState
      title="We could not find that page"
      description="The story may have moved or never existed."
      action={
        <Link href="/" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink">
          Back to stories
        </Link>
      }
    />
  );
}
