import { formatMessage as m } from "@stellara/i18n";

import { AnswerTile, QuestionCard } from "../src/learning.js";
import { LessonCards, PlacementResult, SetCard, StarGrow, WorkedAnswer } from "../src/practice.js";

import type { StarLevel } from "../src/learning.js";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

const meta = {
  title: "Sweet garden/Practice",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const stack = (children: ReactNode) => (
  <div className="mx-auto flex max-w-[480px] flex-col gap-6">{children}</div>
);

export const TodaysSet: Story = {
  render: () =>
    stack(
      <SetCard
        topic="Fractions"
        title={m("todaySet.title")}
        detail={m("todaySet.detail", { count: 10, minutes: 10 })}
        action={{ label: m("todaySet.start"), href: "#" }}
      />,
    ),
};

export const CheckingAnswer: Story = {
  render: () =>
    stack(
      <QuestionCard
        header={m("practice.header", { topic: "Fractions", current: 6, total: 10 })}
        stem="Which fraction is the same as one half?"
      >
        <AnswerTile>1/3</AnswerTile>
        <AnswerTile state="checking" stateLabel={m("practice.checking")}>
          2/4
        </AnswerTile>
        <AnswerTile>3/4</AnswerTile>
      </QuestionCard>,
    ),
};

export const WorkedExample: Story = {
  render: () =>
    stack(
      <WorkedAnswer
        title={m("explanation.title")}
        actionLabel={m("explanation.next")}
        onAction={() => undefined}
      >
        Two quarters fill the same space as one half, so 2/4 = 1/2.
      </WorkedAnswer>,
    ),
};

export const Lesson: Story = {
  render: () =>
    stack(
      <LessonCards
        cards={[
          {
            kind: "worked_example",
            body: "Find a fraction equal to 1/2.",
            steps: ["Multiply the top by 2: 1 × 2 = 2.", "Multiply the bottom by 2: 2 × 2 = 4."],
          },
          { kind: "summary", body: "Multiply the top and bottom by the same number." },
        ]}
        labels={{
          cards: m("learn.cards"),
          progress: (current, total) => m("progress.count", { current, total }),
          worked: m("learn.workedTitle"),
          summary: m("learn.summaryTitle"),
          check: m("learn.checkTitle"),
          next: m("common.next"),
          back: m("common.back"),
          done: m("learn.start"),
        }}
        onDone={() => undefined}
      />,
    ),
};

const steps: [StarLevel, StarLevel][] = [
  ["not_assessed", "foundation"],
  ["foundation", "developing"],
  ["developing", "proficient"],
  ["advanced", "mastered"],
];

export const StarGrowing: Story = {
  render: () =>
    stack(
      <div className="flex flex-wrap items-end justify-between gap-4">
        {steps.map(([from, to]) => (
          <StarGrow
            key={to}
            from={from}
            to={to}
            size={72}
            label={m("star.label", { topic: "Fractions", state: m(`star.${to}`) })}
          />
        ))}
      </div>,
    ),
};

export const PlacementResults: Story = {
  render: () =>
    stack(
      <PlacementResult
        title={m("placement.resultTitle")}
        body={m("placement.resultBody")}
        strands={[
          {
            id: "whole",
            name: "Whole numbers",
            tone: "looks_secure_so_far",
            label: m("placement.looks_secure_so_far"),
          },
          { id: "frac", name: "Fractions", tone: "check_this", label: m("placement.check_this") },
          {
            id: "dec",
            name: "Decimals",
            tone: "not_yet_measured_enough",
            label: m("placement.not_yet_measured_enough"),
          },
        ]}
      />,
    ),
};
