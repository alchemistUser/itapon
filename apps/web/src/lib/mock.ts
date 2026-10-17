// SPDX-License-Identifier: AGPL-3.0-or-later
// Static mock data for the Phase 11 screens. Copy matches supabase/content/waste_content.json.
// Replaced by Supabase queries + live detections in Phases 12–16.
import type { Category } from "@/lib/detector/types";

export interface PrepStep {
  title: string;
  detail: string;
}

export interface MockItem {
  classKey: string;
  name: string;
  category: Category;
  confidence: number;
  instruction: string;
  reuseTip?: string;
  steps: PrepStep[];
  why: string;
}

export const MOCK_ITEMS: Record<string, MockItem> = {
  paper_bag: {
    classKey: "paper_bag",
    name: "Paper Bag",
    category: "recyclable",
    confidence: 0.95,
    instruction: "Empty it and flatten it, then drop it in the blue bin.",
    reuseTip:
      "If it is still clean and sturdy, keep it for another trip. Recycle it when it is no longer usable.",
    steps: [
      { title: "Check the bag", detail: "Keep it only if it is clean, dry and intact." },
      {
        title: "Give it another use",
        detail: "Use it for dry storage or your next shopping trip.",
      },
      { title: "Recycle when worn out", detail: "Empty and flatten it, then use the blue bin." },
    ],
    why: "Reusing extends the life of paper fibers. Clean, dry paper can then be recycled; grease-soaked paper cannot.",
  },
  banana_peel: {
    classKey: "banana_peel",
    name: "Banana peel",
    category: "biodegradable",
    confidence: 0.91,
    instruction: "Remove stickers, then compost or use the green bin.",
    steps: [
      { title: "Remove stickers", detail: "Fruit stickers are plastic and go in the black bin." },
      { title: "Compost or green bin", detail: "Add it to a compost pile or the green bin." },
    ],
    why: "Organic material breaks down naturally.",
  },
  snack_wrapper: {
    classKey: "snack_wrapper",
    name: "Snack wrapper",
    category: "residual",
    confidence: 0.83,
    instruction: "Empty any food, then place it in the black bin.",
    steps: [
      { title: "Empty it", detail: "Shake out crumbs into the green bin." },
      { title: "Sort it", detail: "Place the wrapper in the black bin." },
    ],
    why: "Mixed-layer film is not recyclable here.",
  },
  battery: {
    classKey: "battery",
    name: "Used battery",
    category: "hazardous",
    confidence: 0.88,
    instruction: "Tape the terminals. Take it to a battery collection point.",
    steps: [
      { title: "Tape the terminals", detail: "Cover both ends with tape to prevent sparks." },
      { title: "Bring it to a collection point", detail: "Use the red bin or a battery drop-off." },
    ],
    why: "Batteries can leak or start fires. Never mix with regular waste.",
  },
};

/** The four-item scan from the "What to do next" frames; first item is the primary. */
export const MOCK_PLAN = ["paper_bag", "banana_peel", "snack_wrapper", "battery"];

export interface MockHistoryEntry {
  id: string;
  name: string;
  category: Category;
  time: string;
}

export const MOCK_HISTORY: { day: string; entries: MockHistoryEntry[] }[] = [
  {
    day: "Recent",
    entries: [
      { id: "h1", name: "Plastic Cup", category: "recyclable", time: "Today 1:40 PM" },
      { id: "h2", name: "Banana Peel", category: "biodegradable", time: "Today 1:40 PM" },
      { id: "h3", name: "Sanitary Napkins", category: "residual", time: "Today 1:40 PM" },
      { id: "h4", name: "AAA Battery", category: "hazardous", time: "Today 1:40 PM" },
    ],
  },
];
