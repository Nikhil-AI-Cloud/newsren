import type { Article, EvidenceItem } from "@/types";

/**
 * SAMPLE DATA: fictional placeholder stories written to demonstrate the
 * layout. They describe no real events, organizations, or results, and the
 * links point to the reserved example.com domain. The "briefing" text is
 * hand-written placeholder copy, not AI output.
 */

const link = (slug: string) => `https://example.com/sample/${slug}`;

function evidence(
  slug: string,
  items: Omit<EvidenceItem, "id" | "url" | "retrievedAt">[],
): EvidenceItem[] {
  return items.map((item, i) => ({
    ...item,
    id: `${slug}-ev-${i + 1}`,
    url: link(`${slug}/evidence-${i + 1}`),
    retrievedAt: null,
  }));
}

export const SAMPLE_ARTICLES: Article[] = [
  {
    id: "a1",
    slug: "sample-open-weight-model-release",
    title: "A lab releases an open-weight language model and shares its own benchmark results",
    excerpt:
      "Placeholder story: the release comes with vendor-reported scores and a licence, while independent testing is still pending.",
    category: "technology",
    topic: { id: "ai-model-releases", label: "AI model releases" },
    sourceId: "src-tech-desk",
    publishedAt: "2026-10-22",
    originalUrl: link("sample-open-weight-model-release"),
    featured: true,
    isSample: true,
    retrievedAt: null,
    briefing: {
      origin: "sample",
      generatedAt: null,
      whatHappened: [
        "A research lab has published model weights and documentation for a new language model, along with benchmark scores the lab ran itself.",
        "The accompanying licence sets conditions on commercial use. No third-party evaluation is listed yet.",
      ],
      whyItMatters: [
        "Vendor-reported scores and independent results can differ, so early numbers are a starting point rather than a verdict.",
        "Licence terms decide who can build on the model, which affects schools, start-ups, and larger companies differently.",
      ],
      explanations: {
        student: [
          "A group made a new AI model and let the public download it. They also showed test scores, but they ran those tests themselves.",
          "Think of it like a student grading their own exam: useful, but you would still like a teacher to check it.",
        ],
        educator: [
          "This is a good example for discussing first-party versus third-party evidence. Ask learners which claims in the announcement could be checked independently.",
          "The licence is also worth a short activity: who may use the model, and for what purposes?",
        ],
        professional: [
          "Treat the published scores as vendor claims until independent benchmarks appear. Check the evaluation setup, test-set contamination risk, and comparison baselines.",
          "Review the licence terms against your intended use before committing engineering time.",
        ],
      },
    },
    evidence: evidence("sample-open-weight-model-release", [
      { sourceId: "src-primary-doc", title: "Model documentation and licence (placeholder)", publishedAt: "2026-10-22", supports: "What was released and under which conditions" },
      { sourceId: "src-primary-doc", title: "Vendor benchmark table (placeholder)", publishedAt: "2026-10-22", supports: "Scores reported by the lab itself" },
      { sourceId: "src-independent-lab", title: "Independent evaluation (not yet published)", publishedAt: "2026-10-23", supports: "Would corroborate or challenge the vendor scores" },
    ]),
  },
  {
    id: "a2",
    slug: "sample-low-power-memory-preprint",
    title: "A preprint describes a memory design aimed at lowering chip power use",
    excerpt:
      "Placeholder story: the work is a preprint and has not been peer reviewed, so its claims are early.",
    category: "technology",
    topic: { id: "semiconductors", label: "Semiconductors" },
    sourceId: "src-tech-desk",
    publishedAt: "2026-10-18",
    originalUrl: link("sample-low-power-memory-preprint"),
    isSample: true,
    retrievedAt: null,
    briefing: {
      origin: "sample",
      generatedAt: null,
      whatHappened: [
        "Researchers posted a preprint outlining a memory design intended to reduce the power chips spend moving data.",
        "The results come from simulation and early lab work described by the authors.",
      ],
      whyItMatters: [
        "Data movement is a major energy cost in computing, so progress here could matter for devices and data centres.",
        "A preprint has not been through peer review, and lab results do not always carry over to manufacturing.",
      ],
      explanations: {
        student: [
          "Computers use energy every time they move data around. These researchers have an idea to waste less of it.",
          "It is an early idea, like a science-fair design, and it still needs to be tested by other people.",
        ],
        educator: [
          "Use this to teach the difference between a preprint and a peer-reviewed paper. Have learners list what extra evidence they would want to see.",
        ],
        professional: [
          "Note the gap between simulation, lab prototype, and volume manufacturing. Watch for replication, fabrication partners, and independent measurements.",
        ],
      },
    },
    evidence: evidence("sample-low-power-memory-preprint", [
      { sourceId: "src-preprint-server", title: "Preprint: low-power memory design (placeholder)", publishedAt: "2026-10-17", supports: "The design and the authors' reported results" },
      { sourceId: "src-tech-desk", title: "Explainer on memory energy costs (placeholder)", publishedAt: "2026-10-18", supports: "Background on why data movement matters" },
    ]),
  },
  {
    id: "a3",
    slug: "sample-district-ai-tools-guidelines",
    title: "A school district publishes pilot guidelines for AI tools in classrooms",
    excerpt:
      "Placeholder story: the guidelines set out permitted uses, disclosure rules, and a review date.",
    category: "education",
    topic: { id: "ai-in-schools", label: "AI in schools" },
    sourceId: "src-learning-review",
    publishedAt: "2026-10-21",
    originalUrl: link("sample-district-ai-tools-guidelines"),
    isSample: true,
    retrievedAt: null,
    briefing: {
      origin: "sample",
      generatedAt: null,
      whatHappened: [
        "A school district released guidelines for a pilot of AI tools in classrooms, covering which uses are allowed and how students should disclose them.",
        "The district says the rules will be reviewed after the pilot.",
      ],
      whyItMatters: [
        "Clear rules help teachers and families know what is expected, and pilots give schools evidence before wider adoption.",
        "What the pilot measures will determine whether the findings are useful beyond this district.",
      ],
      explanations: {
        student: [
          "Your school may soon have rules about when you can use AI for schoolwork and how to say that you used it.",
          "The rules are a trial, so they could change after the school sees how it goes.",
        ],
        educator: [
          "Consider how the guidelines map to your assessment design. Which tasks still show individual understanding, and which now need a disclosure step?",
        ],
        professional: [
          "Look for what the pilot will measure, over what period, and for which student groups. Those details determine how far the results generalise.",
        ],
      },
    },
    evidence: evidence("sample-district-ai-tools-guidelines", [
      { sourceId: "src-primary-doc", title: "District guidelines document (placeholder)", publishedAt: "2026-10-21", supports: "The permitted uses and disclosure rules" },
      { sourceId: "src-learning-review", title: "Coverage of the pilot announcement (placeholder)", publishedAt: "2026-10-21", supports: "The review timeline" },
    ]),
  },
  {
    id: "a4",
    slug: "sample-tutoring-study-comparison",
    title: "A study compares worked-example tutoring with practice-only software",
    excerpt:
      "Placeholder story: the report separates finishing exercises faster from showing better understanding on new problems.",
    category: "education",
    topic: { id: "learning-research", label: "Learning research" },
    sourceId: "src-learning-review",
    publishedAt: "2026-10-15",
    originalUrl: link("sample-tutoring-study-comparison"),
    isSample: true,
    retrievedAt: null,
    briefing: {
      origin: "sample",
      generatedAt: null,
      whatHappened: [
        "A research team compared two ways of teaching with software: showing worked examples first, or giving students practice problems straight away.",
        "The report distinguishes speed on familiar exercises from performance on unfamiliar problems.",
      ],
      whyItMatters: [
        "Completing exercises quickly and understanding an idea well enough to apply it elsewhere are different outcomes.",
        "Who took part and what was measured limits how widely the findings apply.",
      ],
      explanations: {
        student: [
          "Looking at a solved example before trying problems might help you learn the idea, not just finish faster.",
          "This was one study, so it is a clue and not a rule.",
        ],
        educator: [
          "Check the studied population and outcome measures before generalising to your classroom. Transfer tasks are the more telling measure.",
        ],
        professional: [
          "Ask about sample size, comparison groups, effect sizes, and whether outcomes were measured immediately or after a delay.",
        ],
      },
    },
    evidence: evidence("sample-tutoring-study-comparison", [
      { sourceId: "src-preprint-server", title: "Study report (placeholder)", publishedAt: "2026-10-14", supports: "Design, participants, and measured outcomes" },
      { sourceId: "src-independent-lab", title: "Commentary on the methods (placeholder)", publishedAt: "2026-10-16", supports: "Limits of the evidence" },
    ]),
  },
  {
    id: "a5",
    slug: "sample-supplier-capacity-announcement",
    title: "A component supplier announces plans to add manufacturing capacity",
    excerpt:
      "Placeholder story: the announcement is a plan, and actual output has not been reported.",
    category: "industry",
    topic: { id: "supply-chains", label: "Supply chains" },
    sourceId: "src-industry-ledger",
    publishedAt: "2026-10-20",
    originalUrl: link("sample-supplier-capacity-announcement"),
    isSample: true,
    retrievedAt: null,
    briefing: {
      origin: "sample",
      generatedAt: null,
      whatHappened: [
        "A component supplier said it intends to expand manufacturing capacity over the coming years.",
        "The company described a plan and timeline. It has not reported output from the new capacity.",
      ],
      whyItMatters: [
        "Announced capacity and delivered output are different things, and timelines often move.",
        "Customers and suppliers may adjust plans, but any downstream effects at this stage are hypotheses.",
      ],
      explanations: {
        student: [
          "A company says it wants to build more factory space to make parts. Saying you will build it is not the same as having it ready.",
        ],
        educator: [
          "A useful case for separating announcements, projections, and results. Ask learners what evidence would show the capacity actually exists.",
        ],
        professional: [
          "Treat downstream effects as scenarios. Track customer commitments, equipment orders, and reported output against the stated timeline.",
        ],
      },
    },
    evidence: evidence("sample-supplier-capacity-announcement", [
      { sourceId: "src-primary-doc", title: "Company announcement (placeholder)", publishedAt: "2026-10-20", supports: "The plan and stated timeline" },
      { sourceId: "src-industry-ledger", title: "Industry analysis (placeholder)", publishedAt: "2026-10-20", supports: "Context on how such plans usually unfold" },
    ]),
  },
  {
    id: "a6",
    slug: "sample-employer-skills-demand",
    title: "Employers report shifting demand for data skills, according to a survey",
    excerpt:
      "Placeholder story: survey responses describe hiring intentions, which are not the same as hiring outcomes.",
    category: "industry",
    topic: { id: "skills-and-careers", label: "Skills and careers" },
    sourceId: "src-industry-ledger",
    publishedAt: "2026-10-12",
    originalUrl: link("sample-employer-skills-demand"),
    isSample: true,
    retrievedAt: null,
    briefing: {
      origin: "sample",
      generatedAt: null,
      whatHappened: [
        "A survey of employers describes changing demand for data-related skills across several sectors.",
        "The results reflect what respondents say they expect to do.",
      ],
      whyItMatters: [
        "Stated intentions can differ from actual hiring, so the survey is one input among several.",
        "Learners and career changers can use it to decide which questions to research further.",
      ],
      explanations: {
        student: [
          "Companies say they may want people with more data skills. It is a hint about what could be useful to learn, not a promise of jobs.",
        ],
        educator: [
          "Pair this with labour-market data to discuss the difference between surveys of intent and records of actual hiring.",
        ],
        professional: [
          "Check the survey's sample, response rate, and sector mix. Compare against job-posting and employment data before acting on it.",
        ],
      },
    },
    evidence: evidence("sample-employer-skills-demand", [
      { sourceId: "src-primary-doc", title: "Survey report (placeholder)", publishedAt: "2026-10-12", supports: "What respondents reported" },
      { sourceId: "src-independent-lab", title: "Methodology review (placeholder)", publishedAt: "2026-10-13", supports: "How the survey was run" },
    ]),
  },
  {
    id: "a7",
    slug: "sample-backtest-ai-portfolio-note",
    title: "A bank research note reports a backtest of AI portfolio agents",
    excerpt:
      "Placeholder story: the result is a historical backtest, which is different from a live track record.",
    category: "finance",
    topic: { id: "ai-in-finance", label: "AI in finance" },
    sourceId: "src-markets-brief",
    publishedAt: "2026-10-19",
    originalUrl: link("sample-backtest-ai-portfolio-note"),
    isSample: true,
    retrievedAt: null,
    briefing: {
      origin: "sample",
      generatedAt: null,
      whatHappened: [
        "A bank's research team published a note describing how software agents performed in a backtest over a past period.",
        "The note labels the result as a backtest. Period, benchmark, and cost assumptions should be read in the original.",
      ],
      whyItMatters: [
        "A backtest replays history and can be shaped by choices made after the fact. It is not evidence of future results.",
        "Knowing whether a claim is a backtest, a simulation, or a live result helps readers judge it.",
      ],
      explanations: {
        student: [
          "A backtest asks, \"how would this plan have done in the past?\" That is different from trying it with real money going forward.",
        ],
        educator: [
          "Useful for teaching overfitting: a method tuned on past data can look strong and still fail on new data.",
        ],
        professional: [
          "Check the period, benchmark, assumed costs, and whether the test was in-sample. Read the authors' own cautions in the original note.",
        ],
      },
    },
    evidence: evidence("sample-backtest-ai-portfolio-note", [
      { sourceId: "src-primary-doc", title: "Research note (placeholder)", publishedAt: "2026-10-19", supports: "The backtest description and authors' caveats" },
      { sourceId: "src-markets-brief", title: "News coverage (placeholder)", publishedAt: "2026-10-19", supports: "How the result was reported" },
    ]),
  },
  {
    id: "a8",
    slug: "sample-regulator-ai-claims-notice",
    title: "A regulator publishes a notice about marketing claims that mention AI",
    excerpt:
      "Placeholder story: the notice reminds firms that statements about AI capabilities must be accurate.",
    category: "finance",
    topic: { id: "regulation-watch", label: "Regulation watch" },
    sourceId: "src-markets-brief",
    publishedAt: "2026-10-10",
    originalUrl: link("sample-regulator-ai-claims-notice"),
    isSample: true,
    retrievedAt: null,
    briefing: {
      origin: "sample",
      generatedAt: null,
      whatHappened: [
        "A financial regulator published a notice saying that claims about AI use in marketing should be accurate and supportable.",
        "The notice describes expectations for firms. It does not name any specific products.",
      ],
      whyItMatters: [
        "Readers can use it to ask whether a firm's AI claim describes an announcement, a pilot, or something running with real customers.",
        "Who is affected and when changes apply are set out in the original notice.",
      ],
      explanations: {
        student: [
          "Companies are reminded they cannot say their product uses AI unless that is true.",
        ],
        educator: [
          "Good material for a media-literacy discussion: how can you tell a real capability from a marketing phrase?",
        ],
        professional: [
          "Read the notice for scope, effective dates, and examples. Compliance and communications teams may want to review current AI-related claims.",
        ],
      },
    },
    evidence: evidence("sample-regulator-ai-claims-notice", [
      { sourceId: "src-regulator", title: "Regulator notice (placeholder)", publishedAt: "2026-10-10", supports: "The expectations and who they apply to" },
      { sourceId: "src-markets-brief", title: "Summary of the notice (placeholder)", publishedAt: "2026-10-10", supports: "Plain-language overview" },
    ]),
  },
];
