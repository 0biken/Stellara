"use client";

import { formatMessage as m } from "@stellara/i18n";
import { AnswerTile, Field, TextInput, type AnswerState } from "@stellara/ui";
import { useId } from "react";

import type { ChildResponse } from "../../lib/learning";
import type { ClientItem } from "@stellara/content-schema/client";

export type QuestionPhase = "answer" | "checking" | "correct" | "notQuite" | "worked" | "saved";

const same = (a: ChildResponse | null, b: ChildResponse | null) =>
  !!a && !!b && JSON.stringify(a) === JSON.stringify(b);

/** Renders the answer area for one item. Supports single choice and numeric items. */
export function QuestionView({
  item,
  phase,
  selected,
  missed,
  onSelect,
  onSubmit,
}: {
  item: ClientItem;
  phase: QuestionPhase;
  selected: ChildResponse | null;
  /** The first answer that was not right; it stays marked while the child tries again. */
  missed: ChildResponse | null;
  onSelect: (response: ChildResponse) => void;
  onSubmit: () => void;
}) {
  const inputId = useId();
  const open = phase === "answer" || phase === "notQuite";

  if (item.type === "single_choice") {
    return (
      <>
        {item.options.map((option) => {
          const response = { choice: option.id };
          const isSelected = same(selected, response);
          let state: AnswerState = "default";
          let stateLabel: string | undefined;
          if (same(missed, response) || (phase === "worked" && isSelected)) {
            state = "not-quite";
            stateLabel = m("answer.notQuiteShort");
          } else if (isSelected && phase === "checking") {
            state = "checking";
            stateLabel = m("practice.checking");
          } else if (isSelected && phase === "correct") {
            state = "correct";
            stateLabel = m("answer.correct");
          } else if (isSelected) state = "selected";
          else if (!open) state = "disabled";
          return (
            <AnswerTile
              key={option.id}
              {...(state === "correct" || state === "not-quite" || state === "checking"
                ? { state, stateLabel: stateLabel! }
                : { state })}
              onClick={() => onSelect(response)}
            >
              {option.text}
            </AnswerTile>
          );
        })}
      </>
    );
  }

  if (item.type === "numeric") {
    const value = typeof selected?.value === "string" ? selected.value : "";
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (open && value.trim()) onSubmit();
        }}
      >
        <Field id={inputId} label={m("practice.numericLabel")} help={m("practice.numericHint")}>
          <TextInput
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            value={value}
            readOnly={!open}
            onChange={(event) => onSelect({ value: event.target.value })}
            className="text-xl"
          />
        </Field>
      </form>
    );
  }

  return null;
}
