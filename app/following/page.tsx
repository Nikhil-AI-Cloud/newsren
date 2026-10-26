import type { Metadata } from "next";
import { FollowedTopicsView } from "@/components/following/followed-topics-view";
import { SaveTopicForm } from "@/components/following/save-topic-form";

export const metadata: Metadata = { title: "Followed sources and saved topics" };

export default function FollowingPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-3">
        <h1 className="font-serif text-4xl font-semibold leading-tight">Following</h1>
        <p className="text-lg text-muted">
          Topics you save and sources you follow are stored in this browser only. Nothing runs
          automatically: update checks happen when you click.
        </p>
      </header>
      <SaveTopicForm />
      <FollowedTopicsView />
    </div>
  );
}
