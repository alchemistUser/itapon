// @vitest-environment jsdom
// SPDX-License-Identifier: AGPL-3.0-or-later
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const submitFeedback = vi.fn(async (input: unknown) => (input ? {} : {}));
vi.mock("@/lib/feedback", () => ({ submitFeedback: (i: unknown) => submitFeedback(i) }));

import { FeedbackPrompt } from "@/components/scan/feedback-prompt";

afterEach(cleanup);
beforeEach(() => submitFeedback.mockClear());

const photo = new Blob(["jpeg"], { type: "image/jpeg" });
const renderPrompt = () =>
  render(
    <FeedbackPrompt classKey="plastic_cup" detectionId="det-1" modelVersion="v0.1" photo={photo} />,
  );

describe("Was this right? (Phase 20)", () => {
  it("Yes sends one tap of feedback without the photo", async () => {
    renderPrompt();
    fireEvent.click(screen.getByRole("button", { name: /Yes/ }));
    await screen.findByText(/Thanks!/);
    expect(submitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        detectionId: "det-1",
        isCorrect: true,
        consent: false,
        photo: null,
      }),
    );
  });

  it("No asks for the right item; the photo goes only with consent", async () => {
    renderPrompt();
    fireEvent.click(screen.getByRole("button", { name: /No/ }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "battery" } });
    fireEvent.click(await screen.findByRole("button", { name: /Battery/ }));
    expect(screen.getByText(/goes in the hazardous/i)).toBeTruthy();
    const consent = screen.getByRole("checkbox");
    expect((consent as HTMLInputElement).checked).toBe(false); // unticked by default
    fireEvent.click(consent);
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(submitFeedback).toHaveBeenCalledTimes(1));
    expect(submitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        isCorrect: false,
        correctedClassKey: "battery",
        consent: true,
        photo,
      }),
    );
  });

  it("Something else sends no item, and no photo without consent", async () => {
    renderPrompt();
    fireEvent.click(screen.getByRole("button", { name: /No/ }));
    fireEvent.click(screen.getByRole("button", { name: /Something else/ }));
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(submitFeedback).toHaveBeenCalledTimes(1));
    expect(submitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ correctedClassKey: null, consent: false, photo: null }),
    );
  });

  it("shows the error and lets the user retry", async () => {
    submitFeedback.mockResolvedValueOnce({ error: "Couldn't send your answer." } as never);
    renderPrompt();
    fireEvent.click(screen.getByRole("button", { name: /Yes/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Couldn't send/);
    expect(screen.getByRole("button", { name: /Yes/ })).toBeTruthy();
  });
});
