import type { Category, ExplanationMode } from "@/types";

export const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  { id: "technology", label: "Technology", blurb: "Models, research, and products" },
  { id: "education", label: "Education", blurb: "Policy, learning research, and tools" },
  { id: "industry", label: "Industry", blurb: "Companies, supply chains, and skills" },
  { id: "finance", label: "Finance", blurb: "Funding, filings, and regulation" },
];

export const EXPLANATION_MODES: { id: ExplanationMode; label: string; hint: string }[] = [
  { id: "student", label: "Student", hint: "Plain language, key ideas first" },
  { id: "educator", label: "Educator", hint: "Teaching angles and discussion" },
  { id: "professional", label: "Professional", hint: "Implications and open questions" },
];

export function categoryLabel(id: Category): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
