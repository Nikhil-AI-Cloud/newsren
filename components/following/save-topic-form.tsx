"use client";

import { useId, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { TOPIC_MAX, useFollowedTopics } from "@/hooks/use-followed-topics";
import type { Category } from "@/types";

export function SaveTopicForm() {
  const { saveTopic } = useFollowedTopics();
  const id = useId();
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="space-y-3 rounded-lg border border-line bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const result = saveTopic(text, category || null);
        if (result.ok) {
          setText("");
          setError(null);
          setSaved(true);
        } else {
          setError(result.error);
          setSaved(false);
        }
      }}
    >
      <h2 className="font-serif text-2xl font-semibold">Save a topic or question</h2>
      <p className="text-sm text-muted">
        For example, “AI tools for mathematics education”. It is saved in this browser only and is
        not monitored automatically. You can check it for new matching coverage whenever you like.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={`${id}-text`} className="sr-only">
          Topic or research question
        </label>
        <input
          id={`${id}-text`}
          value={text}
          maxLength={TOPIC_MAX}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder="A topic or a question you want to follow"
          className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2 text-base"
        />
        <label htmlFor={`${id}-cat`} className="sr-only">
          Category
        </label>
        <select
          id={`${id}-cat`}
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | "")}
          className="rounded-md border border-line bg-paper px-3 py-2 text-base"
        >
          <option value="">Any category</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-ink"
        >
          Save topic
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-accent-ink">
          Saved.
        </p>
      )}
    </form>
  );
}
