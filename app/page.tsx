import { Suspense } from "react";
import { ArticleBrowser } from "@/components/articles/article-browser";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { ReloadButton } from "@/components/ui/reload-button";
import { listArticles } from "@/server/content";

async function HomeContent() {
  const { articles, statuses, refreshedAt, mode } = await listArticles();

  if (mode === "live" && statuses.length > 0 && statuses.every((s) => s.state === "failed")) {
    return (
      <ErrorState
        title="No sources are reachable right now"
        description="Every approved feed failed on the latest refresh, so there is nothing to show. Newsren does not substitute sample stories."
      >
        <ReloadButton label="Try again" />
      </ErrorState>
    );
  }
  return <ArticleBrowser articles={articles} statuses={statuses} refreshedAt={refreshedAt} />;
}

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="max-w-2xl space-y-3">
        <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">
          Understand the news, then follow it.
        </h1>
        <p className="text-lg text-muted">
          Technology, education, industry, and finance from official and original publishers, with
          every story linked back to its source.
        </p>
      </section>
      <Suspense fallback={<LoadingState label="Loading stories from sources" />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}
