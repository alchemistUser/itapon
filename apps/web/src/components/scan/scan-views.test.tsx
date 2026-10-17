// @vitest-environment jsdom
// SPDX-License-Identifier: AGPL-3.0-or-later
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BinRow } from "@/components/bins/bins";
import { BINS } from "@/lib/bins";
import { ResultPanel, ResultSheet, type ResultView } from "@/components/scan/scan-views";

afterEach(cleanup);

const battery: ResultView = {
  classKey: "battery",
  name: "Battery",
  category: "hazardous",
  instruction: "Tape the ends and take it to a hazardous-waste drop-off.",
  confidence: 0.82,
};

describe("result views", () => {
  it("phone sheet shows the bin, the instruction and the result link", () => {
    render(<ResultSheet item={battery} onNext={() => {}} />);
    expect(screen.getByRole("heading", { name: /hazardous/i })).toBeTruthy();
    expect(screen.getByText(/Tape the ends/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "See where it goes" }).getAttribute("href")).toBe(
      "/scan/result/battery",
    );
    expect(screen.queryByText(/We think this is/)).toBeNull(); // confident: no "unsure" note
  });

  it("an unsure result says so and lists the alternatives", () => {
    const cup: ResultView = {
      classKey: "plastic_cup",
      name: "Plastic cup",
      category: "recyclable",
      instruction: "Rinse it.",
      confidence: 0.22,
      alternatives: [{ ...battery, confidence: 0.18 }],
    };
    render(<ResultSheet item={cup} />);
    expect(screen.getByText(/We think this is plastic cup \(22%\)/)).toBeTruthy();
    expect(screen.getByText("battery")).toBeTruthy();
  });

  it("renders the feedback slot and the plan link only for multi-item scans", () => {
    const { rerender } = render(
      <ResultPanel item={{ ...battery, planCount: 1 }} feedback={<p>slot</p>} />,
    );
    expect(screen.getByText("slot")).toBeTruthy();
    expect(screen.queryByText(/What to do next/)).toBeNull();
    rerender(<ResultPanel item={{ ...battery, planCount: 3 }} />);
    expect(screen.getByText(/What to do next · 3 items/)).toBeTruthy();
  });

  it("bin row follows the kiosk's physical order", () => {
    const { container } = render(
      <BinRow active="residual" order={["hazardous", "residual", "recyclable", "biodegradable"]} />,
    );
    expect(within(container).getByText("Correct bin: Residual")).toBeTruthy();
    const shown = [...container.querySelectorAll("li")].map((li) => li.textContent);
    expect(shown).toEqual(
      (["hazardous", "residual", "recyclable", "biodegradable"] as const).map(
        (c) => BINS[c].shortName,
      ),
    );
  });
});
