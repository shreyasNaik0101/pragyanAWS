import {
  RevisionSchema,
  type Revision,
  type CreateInput,
  type Passage,
} from "./index";
export const samples = [
  {
    title: "How a request travels across the internet",
    label: "Networks · Diagram",
    topic: "network",
  },
  {
    title: "Binary search, one decision at a time",
    label: "Algorithms · Code",
    topic: "binary",
  },
  {
    title: "A safer equipment handover",
    label: "Operations · Source material",
    topic: "handover",
  },
];
export const handover =
  "Before starting a shift, inspect the equipment for visible damage and check the maintenance log.\n\nIf you find damage, stop and report it to the shift supervisor. Do not operate the equipment until the supervisor confirms it is safe.\n\nRecord the inspection time, equipment identifier, and your name in the handover log. The incoming operator must acknowledge the handover before taking control.";
export function fixture(input: CreateInput, sources: Passage[]): Revision {
  const common = { duration: 10, animation_type: "fade" };
  const make = (
    id: string,
    title: string,
    narration: string,
    visual: object,
    sourceIds: string[] = [],
  ) => ({
    id,
    title,
    narration,
    visual: { ...common, text: narration, ...visual },
    sourceIds,
    basis: sourceIds.length ? "source" : "explanation",
    audio: { status: "missing" },
  });
  let scenes: unknown[];
  if (input.workflow === "material")
    scenes = sources
      .slice(0, 5)
      .map((s, i) =>
        make(
          `s${i + 1}`,
          `Step ${i + 1}: review the material`,
          s.text.slice(0, 700),
          {
            kind: "concept",
            visual_cue: s.text.split(/[.!?]/)[0].slice(0, 110),
          },
          [s.id],
        ),
      );
  else if (/binary|search|algorithm/i.test(input.title))
    scenes = [
      make(
        "s1",
        "Start with a sorted list",
        "Binary search finds a value in a sorted list. Instead of checking every item, compare the target with the middle item.",
        {
          kind: "diagram",
          nodes: [
            { label: "Sorted list", x: 0, y: 20 },
            { label: "Middle item", x: 50, y: 20 },
            { label: "Compare", x: 100, y: 20 },
          ],
          edges: [
            { from: 0, to: 1, label: "halve" },
            { from: 1, to: 2, label: "target" },
          ],
        },
      ),
      make(
        "s2",
        "Discard half the search space",
        "If the target is smaller than the middle value, keep the left half. Otherwise, keep the right half. Repeat until the value is found.",
        {
          kind: "code",
          language: "python",
          code: "while low <= high:\n    mid = (low + high) // 2\n    if values[mid] == target:\n        return mid\n    if values[mid] < target:\n        low = mid + 1\n    else:\n        high = mid - 1",
          highlights: [2, 5, 6],
        },
      ),
      make(
        "s3",
        "Why it is efficient",
        "Every comparison halves the remaining search space. For a list of one thousand items, about ten comparisons are enough. Sorting is a required precondition.",
        {
          kind: "math",
          steps: [
            "n \\rightarrow n/2 \\rightarrow n/4",
            "T(n) = O(\\log_2 n)",
            "\\lceil \\log_2 1000 \\rceil = 10",
          ],
        },
      ),
    ];
  else if (/network|internet|request|dns|http/i.test(input.title))
    scenes = [
      make(
        "s1",
        "Find the destination",
        "When you open a website, your browser needs the server’s address. A DNS resolver translates the domain name into an IP address.",
        {
          kind: "diagram",
          nodes: [
            { label: "Browser", x: 0, y: 20 },
            { label: "DNS resolver", x: 50, y: 20 },
            { label: "IP address", x: 100, y: 20 },
          ],
          edges: [
            { from: 0, to: 1, label: "domain name" },
            { from: 1, to: 2, label: "lookup" },
          ],
        },
      ),
      make(
        "s2",
        "Send a secure request",
        "The browser establishes a secure connection, then sends an HTTP request. Routers forward packets through the network toward the destination server.",
        {
          kind: "diagram",
          nodes: [
            { label: "Browser", x: 0, y: 20 },
            { label: "Router", x: 50, y: 20 },
            { label: "Server", x: 100, y: 20 },
          ],
          edges: [
            { from: 0, to: 1, label: "HTTPS" },
            { from: 1, to: 2, label: "packets" },
          ],
        },
      ),
      make(
        "s3",
        "Build the page",
        "The server returns a response. Your browser reads the HTML, loads the required styles and scripts, and draws the page you interact with.",
        {
          kind: "code",
          language: "javascript",
          code: 'const response = await fetch("/lesson");\nconst lesson = await response.json();\n\nrenderLesson(lesson);',
          highlights: [1, 2, 4],
        },
      ),
    ];
  else
    throw new Error(
      "LOCAL_FIXTURE: choose the network or binary search sample, or paste your own material. Arbitrary topic generation requires Bedrock.",
    );
  if (input.language !== "english")
    throw new Error(
      "LOCAL_VOICE: this local fixture adapter supports English. Cloud generation supports the selected language; no paid request was made.",
    );
  return RevisionSchema.parse({
    title: input.title,
    language: input.language,
    audience: input.audience,
    theme: "paper",
    scenes,
    sources,
  });
}
