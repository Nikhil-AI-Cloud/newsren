"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import type { ArticleListItem, Category, FeedStatus } from "@/types";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ArticleCard, FeaturedStory } from "./article-card";
import { FollowedStrip } from "./followed-strip";
import { SourceStatus } from "./source-status";

type Filter = Category | "all";

const PAGE_SIZE = 18;

export function ArticleBrowser({
  articles,
  statuses,
  refreshedAt,
}: {
  articles: ArticleListItem[];
  statuses: FeedStatus[];
  refreshedAt: string | null;
}) {
  const [category, setCategory] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (!q) return true;
      return [a.title, a.excerpt ?? "", a.sourceName, a.topic.label]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [articles, category, query]);

  const featured = results.find((a) => a.featured) ?? results[0];
  const rest = results.filter((a) => a !== featured);
  const shown = rest.slice(0, limit);
  const filtered = category !== "all" || query.trim() !== "";

  // A category whose every source failed and has nothing to show is an error, not "no matches".
  const categoryStatuses =
    category === "all" ? [] : statuses.filter((s) => s.category === category);
  const categoryDown =
    categoryStatuses.length > 0 && categoryStatuses.every((s) => s.itemCount === 0 && s.state === "failed");

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div role="search">
          <label htmlFor="story-search" className="sr-only">
            Search stories
          </label>
          <input
            id="story-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder="Search stories, sources, or topics"
            className="w-full rounded-md border border-line bg-card px-4 py-3 text-base placeholder:text-muted/80 focus:border-accent focus:outline-2 focus:outline-accent/30"
          />
        </div>
        <nav aria-label="Categories" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex gap-2 whitespace-nowrap">
            {[{ id: "all" as const, label: "All" }, ...CATEGORIES].map((c) => {
              const active = category === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setCategory(c.id);
                      setLimit(PAGE_SIZE);
                    }}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-accent bg-accent text-white"
                        : "border-line bg-card text-ink hover:border-accent/50"
                    }`}
                  >
                    {c.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <FollowedStrip />
        <SourceStatus statuses={statuses} refreshedAt={refreshedAt} />
      </div>

      <p className="sr-only" aria-live="polite">
        {results.length} {results.length === 1 ? "story" : "stories"} shown
      </p>

      {results.length === 0 ? (
        categoryDown ? (
          <ErrorState
            title={`No working sources for ${categoryLabel(category as Category)} right now`}
            description="Every source in this category failed on the latest refresh. See the source status above, then try again later."
          />
        ) : (
          <EmptyState
            title="No stories match"
            description="Try a different search term or choose another category."
            action={
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
                className="rounded-md border border-line bg-paper px-4 py-2 text-sm font-medium hover:border-accent/50"
              >
                Clear filters
              </button>
            }
          />
        )
      ) : (
        <div className="space-y-8">
          {featured && <FeaturedStory article={featured} />}
          {rest.length > 0 && (
            <section aria-label={filtered ? "Matching stories" : "Latest stories"}>
              <h2 className="mb-4 font-serif text-2xl font-semibold">
                {filtered ? "Matching stories" : "Latest stories"}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {shown.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
              {rest.length > shown.length && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setLimit((n) => n + PAGE_SIZE)}
                    className="rounded-md border border-line bg-card px-5 py-2 text-sm font-medium hover:border-accent/50"
                  >
                    Show more ({rest.length - shown.length} remaining)
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
