import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FinanceNotice } from "@/components/layout/sample-notice";
import { AskNewsren } from "@/components/story/ask-newsren";
import { StoryBrief } from "@/components/story/story-brief";
import { EvidenceList } from "@/components/story/evidence-list";
import { ExplanationSelector } from "@/components/story/explanation-selector";
import { FollowButton } from "@/components/story/follow-button";
import { Provenance } from "@/components/story/provenance";
import { LoadingState } from "@/components/ui/states";
import { categoryLabel } from "@/lib/categories";
import { formatDate, formatDateTime } from "@/lib/format";
import { aiConfigured, peekAiTask } from "@/server/ai";
import { getArticle, getSampleSource } from "@/server/content";
import type { BriefResult, ExplanationResult } from "@/types/ai";
import type { ExplanationMode } from "@/types";

export async function generateMetadata(props: PageProps<"/story/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const result = await getArticle(slug);
  if (!result) return { title: "Story not found" };
  return {
    title: result.article.title,
    description: `${result.source.name}: ${result.article.title}. Publisher excerpt and link to the original.`,
  };
}

async function Story({ params }: { params: PageProps<"/story/[slug]">["params"] }) {
  const { slug } = await params;
  const result = await getArticle(slug);
  if (!result) notFound();

  const { article, status, source } = result;
  const { briefing } = article;
  const live = !article.isSample;
  const aiAvailable = aiConfigured();
  // Cache-only lookups: page rendering never calls the AI provider.
  const initialBrief = live ? (peekAiTask({ task: "brief", articleId: article.id }) as BriefResult | null) : null;
  const initialExplanations: Partial<Record<ExplanationMode, ExplanationResult>> = {};
  if (live) {
    for (const audience of ["student", "educator", "professional"] as const) {
      const hit = peekAiTask({ task: "explain", articleId: article.id, audience }) as ExplanationResult | null;
      if (hit) initialExplanations[audience] = hit;
    }
  }
  const evidence = article.evidence.map((e) => ({ ...e, source: getSampleSource(e.sourceId) }));

  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <Link href="/" className="text-sm text-accent-ink hover:underline">
        ← All stories
      </Link>

      <header className="space-y-4">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold uppercase tracking-wide text-accent">
            {categoryLabel(article.category)}
          </span>
          {article.isSample && (
            <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
              Sample story
            </span>
          )}
        </p>
        <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">{article.title}</h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
          <span className="font-medium text-ink">{source.name}</span>
          {article.publishedAt ? (
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          ) : (
            <span>Publication date not provided</span>
          )}
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-ink underline underline-offset-2 hover:text-accent"
          >
            {article.isSample ? "Read the original article (sample link)" : `Read the original at ${source.name}`}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
        {article.retrievedAt && (
          <p className="text-sm text-muted">Retrieved by Newsren {formatDateTime(article.retrievedAt)}</p>
        )}
        {status && status.state !== "ok" && (
          <p role="status" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
            {status.state === "stale"
              ? `${source.name} could not be reached on the latest refresh, so this story may be out of date.`
              : `${source.name} could not be reached on the latest refresh.`}
            {status.retrievedAt ? ` Last retrieved ${formatDateTime(status.retrievedAt)}.` : ""}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 border-y border-line py-4">
          <FollowButton
            source={{
              id: article.topic.id,
              label: article.topic.label,
              category: article.category,
              sourceArticleSlug: article.slug,
            }}
          />
          <span className="text-sm text-muted">
            Source feed: {article.topic.label}. Monitoring is not connected yet.
          </span>
        </div>
        {article.category === "finance" && <FinanceNotice />}
      </header>

      {article.excerpt && (
        <section aria-labelledby="excerpt-title" className="space-y-3">
          <h2 id="excerpt-title" className="font-serif text-2xl font-semibold">
            Publisher excerpt
          </h2>
          <blockquote className="border-l-4 border-accent/40 pl-4 text-lg leading-relaxed">
            {article.excerpt}
          </blockquote>
          <p className="text-sm text-muted">
            Excerpt supplied by {source.name} in its feed. Read the full story at the original link
            above.
          </p>
        </section>
      )}

      {briefing ? (
        <>
          <section aria-labelledby="happened-title" className="space-y-4">
            <h2 id="happened-title" className="font-serif text-2xl font-semibold">
              What happened?
            </h2>
            <div className="space-y-4 text-lg leading-relaxed">
              {briefing.whatHappened.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
          <section aria-labelledby="matters-title" className="space-y-4">
            <h2 id="matters-title" className="font-serif text-2xl font-semibold">
              Why it matters
            </h2>
            <div className="space-y-4 text-lg leading-relaxed">
              {briefing.whyItMatters.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        </>
      ) : (
        <StoryBrief slug={article.slug} initial={initialBrief} aiAvailable={aiAvailable} />
      )}

      <ExplanationSelector slug={article.slug} sample={briefing?.explanations ?? null} initial={initialExplanations} aiAvailable={aiAvailable} />
      {briefing ? <EvidenceList items={evidence} /> : <Provenance article={article} source={source} />}
      <AskNewsren slug={article.slug} enabled={live} aiAvailable={aiAvailable} />
    </article>
  );
}

export default function StoryPage(props: PageProps<"/story/[slug]">) {
  return (
    <Suspense fallback={<LoadingState label="Loading story" />}>
      <Story params={props.params} />
    </Suspense>
  );
}
