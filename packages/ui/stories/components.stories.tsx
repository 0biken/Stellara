import { formatMessage as m } from "@stellara/i18n";
import { useState } from "react";

import { Button } from "../src/button.js";
import { Dialog, ExplanationSheet, Sheet } from "../src/dialog.js";
import { EmptyState, ReportBlock } from "../src/feedback.js";
import { Field, OtpInput, PhoneInput, Select, TextInput, Toggle } from "../src/forms.js";
import { Icon } from "../src/icons.js";
import {
  AnswerTile,
  DayRow,
  HintCard,
  ProgressBar,
  QuestionCard,
  Sky,
  StardustChip,
  StarState,
  Timer,
} from "../src/learning.js";
import { Nav } from "../src/navigation.js";
import { PictureKey } from "../src/picture-key.js";
import { pictureIds, ProfilePicker } from "../src/pictures.js";

import type { StarLevel } from "../src/learning.js";
import type { PictureId } from "../src/pictures.js";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

const meta = {
  title: "Sweet garden/Components",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const avatar = "/assets/auntie-stella/auntie-stella-avatar-round.svg";
const listening = "/assets/auntie-stella/auntie-stella-listening.svg";
const labels = Object.fromEntries(pictureIds.map((id) => [id, m(`pictureKey.${id}`)])) as Record<
  PictureId,
  string
>;
const levels: StarLevel[] = [
  "not_assessed",
  "foundation",
  "developing",
  "proficient",
  "advanced",
  "mastered",
];
const stack = (children: ReactNode) => (
  <div className="mx-auto flex max-w-2xl flex-col gap-6">{children}</div>
);

export const Buttons: Story = {
  render: () =>
    stack(
      <>
        {(["primary", "quiet", "text"] as const).map((variant) => (
          <div key={variant} className="flex flex-wrap gap-3">
            {(["child", "adult"] as const).map((size) => (
              <Button key={size} variant={variant} size={size}>
                {m("common.confirm")}
              </Button>
            ))}
            <Button variant={variant} disabled>
              {m("common.confirm")}
            </Button>
            <Button variant={variant} loading loadingLabel={m("common.loading")}>
              {m("common.confirm")}
            </Button>
          </div>
        ))}
      </>,
    ),
};

export const AnswerStates: Story = {
  render: () =>
    stack(
      <>
        {(["default", "selected", "disabled"] as const).map((state) => (
          <AnswerTile key={state} state={state}>
            ¼
          </AnswerTile>
        ))}
        <AnswerTile state="correct" stateLabel={m("answer.correct")}>
          ½
        </AnswerTile>
        <AnswerTile state="not-quite" stateLabel={m("answer.notQuite")}>
          ¾
        </AnswerTile>
      </>,
    ),
};

export const QuestionAndHint: Story = {
  render: () =>
    stack(
      <QuestionCard
        header={m("question.header", { current: 6, total: 10 })}
        stem={m("explanation.stepOne")}
        stimulusLabel={m("question.stimulus")}
        stimulus={
          <div className="flex gap-3">
            <Icon name="sky" />
            <Icon name="sky" />
            <Icon name="sky" />
            <Icon name="sky" />
          </div>
        }
      >
        <AnswerTile>¼</AnswerTile>
        <AnswerTile>½</AnswerTile>
        <HintCard avatarSrc={avatar} avatarAlt="" title={m("hint.reveal")}>
          {m("explanation.stepOne")}
        </HintCard>
      </QuestionCard>,
    ),
};

export const ProgressAndTimers: Story = {
  render: () =>
    stack(
      <>
        <ProgressBar
          value={6}
          max={10}
          label={m("question.stimulus")}
          valueText={m("progress.count", { current: 6, total: 10 })}
        />
        <ProgressBar
          value={65}
          max={100}
          tone="primary"
          label={m("report.coverageTitle")}
          valueText={m("progress.count", { current: 65, total: 100 })}
        />
        <ProgressBar
          value={0}
          max={10}
          label={m("question.stimulus")}
          valueText={m("progress.count", { current: 0, total: 10 })}
        />
        <ProgressBar
          value={10}
          max={10}
          label={m("question.stimulus")}
          valueText={m("progress.count", { current: 10, total: 10 })}
        />
        <Timer remainingMs={300000} totalMs={2700000} mode="bar" label={m("timer.label")} />
        <Timer remainingMs={300000} totalMs={2700000} mode="numeric" label={m("timer.label")} />
        <p>{m("timer.fiveMinutes")}</p>
        <Timer remainingMs={0} totalMs={2700000} mode="numeric" label={m("timer.label")} />
      </>,
    ),
};

export const StarsAndDays: Story = {
  render: () =>
    stack(
      <>
        <div className="flex flex-wrap items-center gap-5">
          {levels.map((level) => (
            <figure key={level} className="flex flex-col items-center gap-2">
              <StarState level={level} label={level} size={56} />
              <figcaption>{level}</figcaption>
            </figure>
          ))}
        </div>
        <DayRow
          label={m("days.inARow", { count: 3 })}
          days={[
            { letter: "M", label: m("days.monday"), mark: "star" },
            { letter: "T", label: m("days.tuesday"), mark: "cloud" },
            { letter: "W", label: m("days.wednesday"), mark: "empty" },
            { letter: "T", label: m("days.thursday"), mark: "star" },
            { letter: "F", label: m("days.friday"), mark: "empty" },
            { letter: "S", label: m("days.saturday"), mark: "empty" },
            { letter: "S", label: m("days.sunday"), mark: "empty" },
          ]}
        />
        <StardustChip text={m("stardust.amount", { amount: 40 })} />
      </>,
    ),
};

function InteractiveSky() {
  const [topic, setTopic] = useState<string | null>(null);
  return stack(
    <>
      <Sky
        label={m("sky.title")}
        stars={levels.map((level, index) => ({
          id: level,
          label: m("sky.topicLabel", {
            topic: `Sample ${index + 1}: ${level}`,
          }),
          level,
          x: 15 + (index % 3) * 35,
          y: index < 3 ? 25 : 72,
        }))}
        links={[
          { from: "foundation", to: "developing", lit: true },
          { from: "not_assessed", to: "foundation", lit: false },
          { from: "advanced", to: "mastered", lit: true },
        ]}
        onSelect={setTopic}
      />
      <Sheet
        open={topic !== null}
        onOpenChange={(open) => {
          if (!open) setTopic(null);
        }}
        title={m("sky.title")}
        {...(topic === null ? {} : { description: topic })}
        closeLabel={m("common.close")}
      />
    </>,
  );
}
export const Constellation: Story = { render: () => <InteractiveSky /> };

function ModalExample({
  kind,
  initiallyOpen = false,
}: {
  kind: "info" | "confirm" | "sheet" | "explanation";
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const shared = {
    open,
    onOpenChange: setOpen,
    title: m("explanation.title"),
    description: m("foundationNote"),
    closeLabel: m("common.close"),
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>{m("common.trigger")}</Button>
      {kind === "explanation" ? (
        <ExplanationSheet
          {...shared}
          steps={[m("explanation.stepOne"), m("explanation.stepTwo")]}
          nextLabel={m("common.next")}
          completeLabel={m("explanation.next")}
        />
      ) : kind === "sheet" ? (
        <Sheet {...shared}>
          <p>{m("explanation.stepOne")}</p>
        </Sheet>
      ) : (
        <Dialog
          {...shared}
          variant={kind}
          {...(kind === "confirm"
            ? {
                confirmation: {
                  confirmationText: "SAMPLE",
                  label: "Type SAMPLE",
                  actionLabel: m("common.confirm"),
                  onConfirm: () => setOpen(false),
                },
              }
            : {})}
        >
          <p>{m("explanation.stepOne")}</p>
        </Dialog>
      )}
    </>
  );
}
export const InfoDialog: Story = { render: () => <ModalExample kind="info" /> };
export const TypedConfirmation: Story = {
  render: () => <ModalExample kind="confirm" />,
};
export const BottomSheet: Story = {
  render: () => <ModalExample kind="sheet" />,
};
export const WorkedExplanation: Story = {
  render: () => <ModalExample kind="explanation" />,
};
export const OpenDialog: Story = {
  render: () => <ModalExample kind="info" initiallyOpen />,
};
export const OpenSheet: Story = {
  render: () => <ModalExample kind="sheet" initiallyOpen />,
};
export const OpenExplanation: Story = {
  render: () => <ModalExample kind="explanation" initiallyOpen />,
};
export const OpenConfirmation: Story = {
  render: () => <ModalExample kind="confirm" initiallyOpen />,
};

export const PictureEntry: Story = {
  render: () =>
    stack(
      <PictureKey
        labels={labels}
        prompt={m("pictureKey.prompt")}
        enteredLabel={(count) => m("pictureKey.progress", { count })}
        removeLabel={m("pictureKey.removeLast")}
        clearLabel={m("pictureKey.reset")}
      />,
    ),
};
export const Profiles: Story = {
  render: () =>
    stack(
      <ProfilePicker
        title={m("profiles.title")}
        profiles={[
          {
            id: "sample-a",
            name: "Tolu",
            picture: "sun",
            href: "#sample-tolu",
          },
          {
            id: "sample-b",
            name: "Kemi",
            picture: "flower",
            href: "#sample-kemi",
          },
        ]}
      />,
    ),
};

export const FormFields: Story = {
  render: () =>
    stack(
      <>
        <Field id="sample-name" label="Sample name" help="Sample help text">
          <TextInput id="sample-name" help="Sample help text" defaultValue="Tolu" />
        </Field>
        <Field id="sample-phone" label="Sample phone">
          <PhoneInput id="sample-phone" />
        </Field>
        <Field id="sample-otp" label="Sample code">
          <OtpInput id="sample-otp" />
        </Field>
        <Field id="sample-select" label="Sample class">
          <Select id="sample-select">
            <option>Primary 5</option>
            <option>Primary 6</option>
          </Select>
        </Field>
        <Field id="sample-error" label="Sample error" error="Enter a sample value">
          <TextInput id="sample-error" error="Enter a sample value" />
        </Field>
        <Field id="sample-disabled" label="Sample disabled">
          <TextInput id="sample-disabled" disabled />
        </Field>
        <Toggle id="sample-toggle" label={m("appearance.saved")} defaultChecked />
        <Toggle id="sample-toggle-off" label={m("appearance.title")} />
        <Toggle id="sample-toggle-disabled" label={m("appearance.title")} disabled />
      </>,
    ),
};

const childItems = [
  { id: "sky", label: m("nav.sky"), href: "#sky", icon: "sky" },
  { id: "learn", label: m("nav.learn"), href: "#learn", icon: "learn" },
  {
    id: "practice",
    label: m("nav.practice"),
    href: "#practice",
    icon: "practice",
  },
] as const;
export const Navigation: Story = {
  render: () =>
    stack(
      <>
        <Nav label={m("nav.label")} variant="child" activeId="sky" items={childItems} />
        <Nav
          label={m("shell.adult")}
          variant="adult"
          activeId="family"
          items={[
            {
              id: "family",
              label: m("nav.family"),
              href: "#family",
              icon: "children",
            },
          ]}
        />
      </>,
    ),
};
export const ReportBlocks: Story = {
  render: () =>
    stack(
      <>
        <ReportBlock
          kind="stat"
          title={m("report.statTitle")}
          value={m("days.count", { count: 5 })}
        >
          {m("foundationNote")}
        </ReportBlock>
        <ReportBlock kind="celebrate" title={m("report.celebrateTitle")}>
          {m("explanation.stepOne")}
        </ReportBlock>
        <ReportBlock kind="practise-next" title={m("report.nextTitle")}>
          {m("explanation.stepTwo")}
        </ReportBlock>
        <ReportBlock
          kind="coverage"
          title={m("report.coverageTitle")}
          value="65%"
          disclaimer={m("report.coverageDisclaimer")}
        >
          <ProgressBar
            value={65}
            max={100}
            label={m("report.coverageTitle")}
            valueText={m("progress.count", { current: 65, total: 100 })}
            tone="primary"
          />
        </ReportBlock>
        <ReportBlock kind="note" title={m("report.noteTitle")}>
          {m("foundationNote")}
        </ReportBlock>
      </>,
    ),
};
export const EmptyGarden: Story = {
  render: () =>
    stack(
      <EmptyState
        title={m("empty.title")}
        avatarSrc={listening}
        avatarAlt=""
        action={{ label: m("empty.action"), href: "#sample-topics" }}
      >
        {m("empty.description")}
      </EmptyState>,
    ),
};
export const EmptyData: Story = {
  render: () =>
    stack(
      <>
        <Sky stars={[]} links={[]} label={m("sky.title")} />
        <ProfilePicker profiles={[]} title={m("profiles.title")} />
        <Nav items={[]} label={m("nav.label")} />
        <DayRow days={[]} label={m("days.count", { count: 0 })} />
      </>,
    ),
};
export const LongTextAndLargeValues: Story = {
  render: () =>
    stack(
      <>
        <ProfilePicker
          title={m("profiles.title")}
          profiles={[
            {
              id: "long",
              name: "ẸniọláChimamandaMuhammadAbdulrahman".repeat(3),
              picture: "leaf",
              href: "#sample-long",
            },
          ]}
        />
        <Button block>{m("homeDescription").repeat(3)}</Button>
        <AnswerTile>{m("homeDescription").repeat(4)}</AnswerTile>
        <ReportBlock
          kind="stat"
          title={m("report.statTitle")}
          value={m("stardust.amount", { amount: 999999999 })}
        >
          {m("homeDescription").repeat(6)}
        </ReportBlock>
        <StardustChip text={m("stardust.amount", { amount: 999999999 })} />
      </>,
    ),
};
