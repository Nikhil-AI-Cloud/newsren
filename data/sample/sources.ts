import type { Source } from "@/types";

/**
 * SAMPLE DATA. These are fictional placeholder sources, not real publishers.
 * URLs use the reserved example.com domain.
 */
export const SAMPLE_SOURCES: Source[] = [
  { id: "src-tech-desk", name: "Sample Tech Desk", kind: "publisher", homepageUrl: "https://example.com/sample" },
  { id: "src-learning-review", name: "Sample Learning Review", kind: "publisher", homepageUrl: "https://example.com/sample" },
  { id: "src-industry-ledger", name: "Sample Industry Ledger", kind: "publisher", homepageUrl: "https://example.com/sample" },
  { id: "src-markets-brief", name: "Sample Markets Brief", kind: "publisher", homepageUrl: "https://example.com/sample" },
  { id: "src-primary-doc", name: "Sample Primary Document", kind: "primary", homepageUrl: "https://example.com/sample" },
  { id: "src-independent-lab", name: "Sample Independent Lab", kind: "independent", homepageUrl: "https://example.com/sample" },
  { id: "src-preprint-server", name: "Sample Preprint Server", kind: "research", homepageUrl: "https://example.com/sample" },
  { id: "src-regulator", name: "Sample Regulator Notice", kind: "regulator", homepageUrl: "https://example.com/sample" },
];
