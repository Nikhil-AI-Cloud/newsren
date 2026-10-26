import Link from "next/link";
import { categoryLabel } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { ArticleListItem } from "@/types";

function Meta({ article }: { article: ArticleListItem }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
      <span className="font-semibold uppercase tracking-wide text-accent">
        {categoryLabel(article.category)}
      </span>
      <span aria-hidden>·</span>
      <span>{article.sourceName}</span>
      <span aria-hidden>·</span>
      {article.publishedAt ? (
        <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
      ) : (
        <span>Date not provided</span>
      )}
      {article.isSample && (
        <span className="rounded-full border border-line px-2 py-0.5 text-xs">Sample</span>
      )}
    </p>
  );
}

function Excerpt({ text, large }: { text: string | null; large?: boolean }) {
  if (!text) return null;
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Publisher excerpt</p>
      <p className={`text-muted ${large ? "text-lg" : ""}`}>{text}</p>
    </div>
  );
}

export function ArticleCard({ article }: { article: ArticleListItem }) {
  return (
    <article className="group relative flex flex-col gap-3 rounded-lg border border-line bg-card p-5 transition-colors hover:border-accent/50">
      <Meta article={article} />
      <h3 className="font-serif text-xl font-semibold leading-snug">
        <Link
          href={`/story/${article.slug}`}
          className="after:absolute after:inset-0 group-hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {article.title}
        </Link>
      </h3>
      <Excerpt text={article.excerpt} />
    </article>
  );
}

export function FeaturedStory({ article }: { article: ArticleListItem }) {
  return (
    <article className="group relative flex flex-col gap-4 rounded-lg border border-line bg-card p-6 transition-colors hover:border-accent/50 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Featured story</p>
      <Meta article={article} />
      <h2 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
        <Link
          href={`/story/${article.slug}`}
          className="after:absolute after:inset-0 group-hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {article.title}
        </Link>
      </h2>
      <div className="max-w-2xl">
        <Excerpt text={article.excerpt} large />
      </div>
      <span className="text-sm font-medium text-accent-ink">Read the story →</span>
    </article>
  );
}
