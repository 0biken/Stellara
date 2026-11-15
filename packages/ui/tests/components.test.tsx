import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "../src/button.js";
import { TextInput, Field } from "../src/forms.js";
import { AnswerTile, ProgressBar, formatClock, HintCard, StarState, Sky, Timer, QuestionCard } from "../src/learning.js";
import { PictureKey } from "../src/picture-key.js";
import { pictureIds } from "../src/pictures.js";

import type { ComponentProps } from "react";
afterEach(cleanup);
describe("learning controls", () => {
  it("exposes caller supplied remaining time for a visual bar", () => {
    render(<Timer remainingMs={300000} totalMs={2700000} mode="bar" label="Time left" valueText="5 minutes remaining" />);
    expect(screen.getByRole("timer").textContent).toBe("5 minutes remaining");
  });
  it("supports a labelled stimulus and a question without stimulus", () => {
    const plain: ComponentProps<typeof QuestionCard> = { header: "Question", stem: "Count" };
    // @ts-expect-error A stimulus requires an explicit localized disclosure label.
    const missingLabel: ComponentProps<typeof QuestionCard> = { header: "Question", stem: "Count", stimulus: "Sample" };
    expect(missingLabel.stimulus).toBe("Sample");
    render(<QuestionCard {...plain} stimulus="Sample" stimulusLabel="Read the example" />);
    expect(screen.getByText("Read the example").tagName).toBe("SUMMARY");
  });
  it.each(["correct", "not-quite", "disabled"] as const)(
    "locks %s answers even with disabled=false",
    (state) => {
      const select = vi.fn();
      render(
        <AnswerTile state={state} stateLabel="Result" disabled={false} onClick={select}>
          Four
        </AnswerTile>,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(select).not.toHaveBeenCalled();
    },
  );
  it("keeps loading submit buttons disabled and busy", () => {
    const click = vi.fn();
    render(
      <Button type="submit" loading aria-busy={false} onClick={click}>
        Save
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(click).not.toHaveBeenCalled();
    expect(screen.getByRole("button").getAttribute("aria-busy")).toBe("true");
  });
  it("clamps progress ARIA to finite valid bounds", () => {
    render(<ProgressBar value={Infinity} max={-2} label="Set" valueText="0 of 1" />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuemax")).toBe("1");
    expect(bar.getAttribute("aria-valuenow")).toBe("0");
  });
  it("formats nonfinite time safely", () => {
    expect(formatClock(Infinity)).toBe("0:00");
    expect(formatClock(NaN)).toBe("0:00");
    expect(formatClock(61000)).toBe("1:01");
  });
  it("only reveals a hint on request and notifies the caller once", () => {
    const reveal = vi.fn();
    render(
      <HintCard avatarSrc="/avatar.svg" title="Ask" onReveal={reveal}>
        A useful hint
      </HintCard>,
    );
    expect(screen.queryByText("A useful hint")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(screen.getByText("A useful hint")).toBeTruthy();
    expect(reveal).toHaveBeenCalledTimes(1);
  });
  it("draws the mastered bud", () => {
    const { container } = render(<StarState level="mastered" label="Mastered" />);
    expect(container.querySelector('[data-part="bud"]')).not.toBeNull();
  });
  it("names star buttons without depending on their SVG", () => {
    render(
      <Sky
        label="Sky"
        stars={[{ id: "f", label: "Fractions", level: "foundation", x: 0, y: 100 }]}
        links={[]}
      />,
    );
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Fractions");
  });
});
describe("picture key", () => {
  it("allows repeats, announces progress, corrects and resets without duplicate completion", () => {
    const complete = vi.fn();
    const labels = Object.fromEntries(pictureIds.map((id) => [id, id])) as Record<
      (typeof pictureIds)[number],
      string
    >;
    render(
      <PictureKey
        labels={labels}
        prompt="Choose four"
        enteredLabel={(n) => `${n} of 4`}
        removeLabel="Remove last"
        clearLabel="Start again"
        onComplete={complete}
      />,
    );
    const sun = screen.getByRole("button", { name: "sun" });
    fireEvent.click(sun);
    fireEvent.click(sun);
    fireEvent.click(screen.getByRole("button", { name: "Remove last" }));
    expect(screen.getByRole("status").textContent).toContain("1 of 4");
    fireEvent.click(sun);
    fireEvent.click(sun);
    fireEvent.click(sun);
    fireEvent.click(sun);
    expect(complete).toHaveBeenCalledExactlyOnceWith(["sun", "sun", "sun", "sun"]);
    fireEvent.click(screen.getByRole("button", { name: "Start again" }));
    expect(screen.getByRole("status").textContent).toContain("0 of 4");
  });
});
it("preserves error descriptions even with supplied ARIA", () => {
  render(
    <Field id="name" label="Name" error="Enter a name">
      <TextInput
        id="name"
        error="Enter a name"
        aria-invalid={false}
        aria-describedby="additional"
      />
    </Field>,
  );
  const input = screen.getByRole("textbox");
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(input.getAttribute("aria-describedby")).toBe("additional name-error");
});
it("renders active caller routes and mandatory coverage disclaimer", async () => {
  const { Nav } = await import("../src/navigation.js");
  const { ReportBlock } = await import("../src/feedback.js");
  render(
    <>
      <Nav
        label="Main"
        activeId="sky"
        variant="child"
        items={[{ id: "sky", label: "Sky", href: "/provided-sky" }]}
      />
      <ReportBlock kind="coverage" title="Coverage" disclaimer="Not a predicted score">
        Half practised
      </ReportBlock>
    </>,
  );
  expect(screen.getByRole("link", { name: "Sky" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link").getAttribute("href")).toBe("/provided-sky");
  expect(screen.getByText("Not a predicted score")).toBeTruthy();
});
