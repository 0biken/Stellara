import { formatMessage, getCatalogue } from "@stellara/i18n";
import { useMemo } from "react";

import {
  AdultShell,
  AnswerTile,
  Appearance,
  ChildShell,
  ProgressBar,
  QuestionCard,
  ReportBlock,
  StudioShell,
  type AppearanceLabels,
} from "../src/index.js";

import type { Meta, StoryObj } from "@storybook/react-vite";

const copy = getCatalogue();
const labels: AppearanceLabels = {
  title: copy["appearance.title"],
  system: copy["appearance.system"],
  systemDescription: copy["appearance.systemDescription"],
  light: copy["appearance.light"],
  lightDescription: copy["appearance.lightDescription"],
  dark: copy["appearance.dark"],
  darkDescription: copy["appearance.darkDescription"],
  saved: copy["appearance.saved"],
  saveError: copy["appearance.saveError"],
};

/** Isolated device preference: stories never overwrite the viewer's real device choice. */
function AppearanceExample({
  audience,
  theme,
  blocked = false,
}: {
  audience: "parent" | "school";
  theme: "light" | "dark";
  blocked?: boolean;
}) {
  const storage = useMemo(() => {
    let value: string | null = theme;
    return {
      getItem: () => value,
      setItem: (_key: string, next: string) => {
        if (blocked) throw new Error("Device storage is unavailable");
        value = next;
      },
      removeItem: () => {
        if (blocked) throw new Error("Device storage is unavailable");
        value = null;
      },
    };
  }, [theme, blocked]);
  return <Appearance audience={audience} labels={labels} storage={storage} />;
}

const meta = {
  title: "Foundations",
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const AppearanceParent: Story = {
  render: (_args, context) => {
    const theme = context.globals.theme === "dark" ? "dark" : "light";
    return (
      <AdultShell>
        <AppearanceExample key={theme} audience="parent" theme={theme} />
      </AdultShell>
    );
  },
};

export const AppearanceSchool: Story = {
  render: (_args, context) => {
    const theme = context.globals.theme === "dark" ? "dark" : "light";
    return (
      <AdultShell>
        <AppearanceExample key={theme} audience="school" theme={theme} />
      </AdultShell>
    );
  },
};

export const AppearanceBlockedStorage: Story = {
  render: (_args, context) => {
    const theme = context.globals.theme === "dark" ? "dark" : "light";
    return (
      <AdultShell>
        <AppearanceExample key={theme} audience="parent" theme={theme} blocked />
      </AdultShell>
    );
  },
  play: ({ canvasElement }) => {
    // Exercise failed writes, then leave the canvas in the toolbar's chosen theme.
    const original = canvasElement.querySelector<HTMLInputElement>("input:checked");
    canvasElement.querySelector<HTMLInputElement>('input[value="system"]')?.click();
    original?.click();
  },
};

export const Typography: Story = {
  render: () => (
    <AdultShell>
      <div className="flex max-w-prose flex-col gap-6">
        <h1 className="font-heading text-[44px] leading-[50px] font-extrabold">{copy.homeTitle}</h1>
        <h2 className="font-heading text-[28px] leading-[34px] font-bold">
          {copy["appearance.title"]}
        </h2>
        <p className="text-[15px] leading-6">{copy.homeDescription}</p>
        <p className="font-heading text-[28px] leading-[34px] font-bold">ẹ ọ ṣ ń ɓ ɗ ƙ ị ụ ₦</p>
        <p className="text-lg leading-7">ẹ ọ ṣ ń ɓ ɗ ƙ ị ụ ₦</p>
        <p className="text-[15px] leading-6 tabular-nums">
          {formatMessage("money.amount", { amount: 25000 })}
        </p>
        <p className="text-[13px] leading-[18px] font-medium text-muted">{copy.foundationNote}</p>
      </div>
    </AdultShell>
  ),
};

/** Synthetic arithmetic fixture, with the completed answer visible. */
export const ChildArchetype: Story = {
  render: () => (
    <ChildShell>
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-[28px] leading-[34px] font-bold">{copy["shell.child"]}</h1>
        <ProgressBar
          value={6}
          max={10}
          label={copy["nav.learn"]}
          valueText={formatMessage("progress.count", { current: 6, total: 10 })}
        />
        <QuestionCard
          header={formatMessage("question.header", { current: 6, total: 10 })}
          stem="3 + 2 = ?"
        >
          <AnswerTile state="disabled">4</AnswerTile>
          <AnswerTile state="correct" stateLabel={copy["answer.correct"]}>
            5
          </AnswerTile>
          <AnswerTile state="disabled">6</AnswerTile>
        </QuestionCard>
      </div>
    </ChildShell>
  ),
};

export const AdultArchetype: Story = {
  render: () => (
    <AdultShell>
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-[28px] leading-[34px] font-bold">
          {copy["report.title"]}
        </h1>
        <div className="grid gap-5 md:grid-cols-2">
          <ReportBlock
            kind="stat"
            title={copy["report.statTitle"]}
            value={formatMessage("days.count", { count: 5 })}
          >
            {formatMessage("progress.count", { current: 6, total: 10 })}
          </ReportBlock>
          <ReportBlock
            kind="coverage"
            title={copy["report.coverageTitle"]}
            value="60%"
            disclaimer={copy["report.coverageDisclaimer"]}
          >
            <ProgressBar
              value={6}
              max={10}
              label={copy["report.coverageTitle"]}
              valueText={formatMessage("progress.count", { current: 6, total: 10 })}
              tone="primary"
            />
          </ReportBlock>
        </div>
      </div>
    </AdultShell>
  ),
};

export const StudioArchetype: Story = {
  render: () => (
    <StudioShell narrowMessage={copy["shell.studioNarrow"]}>
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-[28px] leading-[34px] font-bold">
          {copy["shell.studio"]}
        </h1>
        <p>{copy.foundationNote}</p>
        <div className="grid grid-cols-2 gap-6">
          <section className="rounded-md border border-line bg-surface p-5">
            <h2 className="font-heading text-xl font-bold">{copy["nav.learn"]}</h2>
            <p className="mt-3">3 + 2 = ?</p>
            <p className="mt-3 text-muted">
              {formatMessage("question.header", { current: 1, total: 10 })}
            </p>
          </section>
          <section className="rounded-md border border-line bg-surface p-5">
            <h2 className="font-heading text-xl font-bold">{copy["nav.practice"]}</h2>
            <p className="mt-3">8 − 3 = ?</p>
            <p className="mt-3 text-muted">
              {formatMessage("question.header", { current: 2, total: 10 })}
            </p>
          </section>
        </div>
      </div>
    </StudioShell>
  ),
};
