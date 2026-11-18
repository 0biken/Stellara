import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnswerTile } from "../src/learning.js";
import { LessonCards, PlacementResult, StarGrow, WorkedAnswer } from "../src/practice.js";

afterEach(cleanup);

const labels = {
  cards: "Lesson cards",
  progress: (c: number, t: number) => `${c} of ${t}`,
  worked: "Worked example",
  summary: "Remember",
  check: "Quick check",
  next: "Next",
  back: "Go back",
  done: "Start practising",
};

describe("practice components", () => {
  it("locks a checking answer and says so in words", () => {
    const click = vi.fn();
    render(
      <AnswerTile state="checking" stateLabel="Checking" onClick={click}>
        2/4
      </AnswerTile>,
    );
    const tile = screen.getByRole("button");
    fireEvent.click(tile);
    expect(click).not.toHaveBeenCalled();
    expect(tile.getAttribute("aria-pressed")).toBe("true");
    expect(tile.textContent).toContain("Checking");
  });

  it("steps through lesson cards and finishes on the last one", () => {
    const done = vi.fn();
    render(
      <LessonCards
        cards={[
          { kind: "explain", body: "Halves are two equal parts." },
          { kind: "summary", body: "Equal parts matter." },
        ]}
        labels={labels}
        onDone={done}
      />,
    );
    expect(screen.getByText("1 of 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Equal parts matter.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByText("Halves are two equal parts.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Start practising" }));
    expect(done).toHaveBeenCalledOnce();
  });

  it("names only the new star when it grows", () => {
    render(<StarGrow from="foundation" to="developing" label="Fractions: Growing" />);
    expect(screen.getAllByRole("img").map((s) => s.getAttribute("aria-label"))).toEqual([
      "Fractions: Growing",
    ]);
  });

  it("moves focus to the worked answer", () => {
    render(
      <WorkedAnswer title="Let's look together" actionLabel="Got it" onAction={() => undefined}>
        Because.
      </WorkedAnswer>,
    );
    expect(document.activeElement?.textContent).toBe("Let's look together");
  });

  it("shows strand labels as words", () => {
    render(
      <PlacementResult
        title="Here's where to start"
        body="Early signs."
        strands={[{ id: "a", name: "Fractions", tone: "check_this", label: "Check this" }]}
      />,
    );
    expect(screen.getByRole("listitem").textContent).toBe("FractionsCheck this");
  });
});
