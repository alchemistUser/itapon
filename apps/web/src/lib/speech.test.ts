// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";

import { partsFor } from "./speech";

const banana = {
  name: "Banana peel",
  nameFil: "Balat ng saging",
  category: "biodegradable" as const,
  instruction: "Remove stickers, then compost or use the green bin.",
};

describe("partsFor", () => {
  it("English: item, bin colour, category and instruction in one part", () => {
    expect(partsFor(banana, "en")).toEqual([
      {
        lang: "en",
        text: "Banana peel. Put it in the green bin, Biodegradable. Remove stickers, then compost or use the green bin.",
      },
    ]);
  });

  it("Filipino: Filipino name + bin colour, then the English instruction", () => {
    expect(partsFor(banana, "fil")).toEqual([
      { lang: "fil", text: "Balat ng saging. Ilagay sa berde na basurahan." },
      { lang: "en", text: banana.instruction },
    ]);
  });

  it("Filipino hazardous mentions the collection point", () => {
    const [first] = partsFor(
      { name: "Battery", nameFil: "Baterya", category: "hazardous", instruction: "Tape it." },
      "fil",
    );
    expect(first.text).toBe("Baterya. Ilagay sa pula na basurahan o sa collection point.");
  });
});
