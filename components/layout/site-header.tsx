import Link from "next/link";
import { FollowingLink } from "./following-link";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-2" aria-label="Newsren home">
          <span aria-hidden className="h-3 w-3 translate-y-0.5 rounded-sm bg-accent" />
          <span className="font-serif text-2xl font-semibold tracking-tight">Newsren</span>
        </Link>
        <nav aria-label="Main">
          <FollowingLink />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <p className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted sm:px-6">
        Newsren prototype. Headlines and excerpts belong to their publishers and link back to the
        original. AI briefs and answers are generated on request from publisher excerpts, not full articles.
      </p>
    </footer>
  );
}
