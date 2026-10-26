import type { FollowedTopic, NotConnected } from "@/types";

/**
 * Contracts for future server-side integrations. Implementations must run on
 * the server only and read credentials from non-NEXT_PUBLIC environment
 * variables, so keys never reach browser code.
 */

export interface AskInput {
  articleSlug: string;
  question: string;
}

/** A grounded answer must cite evidence items by id. */
export interface AskAnswer {
  status: "answered";
  answer: string;
  citedEvidenceIds: string[];
  retrievedAt: string;
}

export interface QuestionAnswerer {
  ask(input: AskInput): Promise<AskAnswer | NotConnected>;
}

export interface TopicUpdate {
  topicId: string;
  summary: string;
  evidenceIds: string[];
  checkedAt: string;
}

export interface UpdateChecker {
  check(topics: FollowedTopic[]): Promise<
    { status: "checked"; updates: TopicUpdate[] } | NotConnected
  >;
}
