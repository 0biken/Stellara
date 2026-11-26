"use client";

import { Button } from "@stellara/ui";
import { useState } from "react";

import type { DraftOption, StructuredQuestion } from "../../lib/admin/content";

const field = "w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-text";
const newOption = () => ({ id: crypto.randomUUID(), text: "" });
const filled = (options: DraftOption[]) => options.filter((option) => option.text.trim());

function OptionList({
  label,
  options,
  onChange,
}: {
  label: string;
  options: DraftOption[];
  onChange: (options: DraftOption[]) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((option, index) => (
        <div key={option.id} className="flex items-end gap-2">
          <label className="min-w-0 flex-1">
            {label} {index + 1}
            <input
              className={field}
              value={option.text}
              onChange={(event) => {
                const text = event.target.value;
                onChange(
                  options.map((entry) => (entry.id === option.id ? { ...entry, text } : entry)),
                );
              }}
            />
          </label>
          <Button
            type="button"
            variant="text"
            aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
            onClick={() => onChange(options.filter((entry) => entry.id !== option.id))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="quiet"
        className="justify-self-start"
        onClick={() => onChange([...options, newOption()])}
      >
        Add {label.toLowerCase()}
      </Button>
    </div>
  );
}

function OptionSelect({
  label,
  options,
  value,
  onSelect,
  placeholder = "Choose an option",
}: {
  label: string;
  options: DraftOption[];
  value?: string;
  onSelect?: (id: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0 break-words">
      {label}
      <select
        className={field}
        value={value}
        onChange={onSelect && ((event) => onSelect(event.target.value))}
        defaultValue={value === undefined ? "" : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.text || "Empty option"}
          </option>
        ))}
      </select>
    </label>
  );
}

function Sequence({
  options,
  ids,
  onChange,
  label,
}: {
  options: DraftOption[];
  ids: string[];
  onChange: (ids: string[]) => void;
  label: string;
}) {
  const remaining = filled(options).filter((option) => !ids.includes(option.id));
  return (
    <fieldset className="grid gap-2">
      <legend className="font-semibold">{label}</legend>
      {ids.length > 0 && (
        <ol className="list-decimal space-y-2 pl-6">
          {ids.map((id) => (
            <li key={id} className="break-words">
              {options.find((option) => option.id === id)?.text || "Empty step"}
              <Button
                type="button"
                variant="text"
                aria-label={`Remove position ${ids.indexOf(id) + 1}`}
                onClick={() => onChange(ids.filter((entry) => entry !== id))}
              >
                Remove
              </Button>
            </li>
          ))}
        </ol>
      )}
      {remaining.length > 0 && (
        <OptionSelect
          label={`Position ${ids.length + 1}`}
          value=""
          options={remaining}
          onSelect={(id) => {
            if (id) onChange([...ids, id]);
          }}
        />
      )}
    </fieldset>
  );
}

export function StructuredAnswerFields({
  question,
  onChange,
}: {
  question: StructuredQuestion;
  onChange: (question: StructuredQuestion) => void;
}) {
  if (question.type === "ordering")
    return (
      <>
        <p className="text-sm text-muted">
          Enter the steps in the order children should see them. Then choose the correct sequence.
        </p>
        <OptionList
          label="Step"
          options={question.options}
          onChange={(options) =>
            onChange({
              ...question,
              options,
              answer: {
                option_ids: question.answer.option_ids.filter((id) =>
                  options.some((option) => option.id === id),
                ),
              },
            })
          }
        />
        <Sequence
          label="Correct sequence"
          options={question.options}
          ids={question.answer.option_ids}
          onChange={(option_ids) => onChange({ ...question, answer: { option_ids } })}
        />
      </>
    );
  if (question.type === "match")
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <OptionList
            label="Left item"
            options={question.left}
            onChange={(left) =>
              onChange({
                ...question,
                left,
                answer: {
                  pairs: question.answer.pairs.filter((pair) =>
                    left.some(({ id }) => id === pair.left_id),
                  ),
                },
              })
            }
          />
          <OptionList
            label="Right item"
            options={question.right}
            onChange={(right) =>
              onChange({
                ...question,
                right,
                answer: {
                  pairs: question.answer.pairs.filter((pair) =>
                    right.some(({ id }) => id === pair.right_id),
                  ),
                },
              })
            }
          />
        </div>
        <fieldset className="grid gap-2">
          <legend className="font-semibold">Correct matches</legend>
          {filled(question.left).map((left) => {
            const pairs = question.answer.pairs.filter((pair) => pair.left_id !== left.id);
            const value =
              question.answer.pairs.find((pair) => pair.left_id === left.id)?.right_id ?? "";
            const options = question.right.filter(
              (right) =>
                right.id === value ||
                (right.text.trim() && !pairs.some((pair) => pair.right_id === right.id)),
            );
            return (
              <OptionSelect
                key={left.id}
                label={`Match for ${left.text}`}
                value={value}
                options={options}
                onSelect={(right_id) =>
                  onChange({
                    ...question,
                    answer: {
                      pairs: right_id ? [...pairs, { left_id: left.id, right_id }] : pairs,
                    },
                  })
                }
              />
            );
          })}
        </fieldset>
      </>
    );
  return (
    <>
      <p className="text-sm text-muted">
        Number the blanks in the question text to match the answer controls below.
      </p>
      {question.slots.map((slot, index) => {
        const answers = question.answer.slots.filter((answer) => answer.slot_id !== slot.id);
        const value =
          question.answer.slots.find((answer) => answer.slot_id === slot.id)?.option_id ?? "";
        return (
          <fieldset key={slot.id} className="grid gap-2 rounded-lg border border-line p-3">
            <legend className="px-1 font-semibold">Blank {index + 1}</legend>
            <OptionList
              label={`Blank ${index + 1} option`}
              options={slot.options}
              onChange={(options) =>
                onChange({
                  ...question,
                  slots: question.slots.map((entry) =>
                    entry.id === slot.id ? { ...entry, options } : entry,
                  ),
                  answer: {
                    slots: options.some(({ id }) => id === value)
                      ? [...answers, { slot_id: slot.id, option_id: value }]
                      : answers,
                  },
                })
              }
            />
            <OptionSelect
              label={`Correct option for blank ${index + 1}`}
              value={value}
              options={slot.options.filter((option) => option.text.trim() || option.id === value)}
              onSelect={(option_id) =>
                onChange({
                  ...question,
                  answer: {
                    slots: option_id ? [...answers, { slot_id: slot.id, option_id }] : answers,
                  },
                })
              }
            />
            <Button
              type="button"
              variant="text"
              className="justify-self-start"
              onClick={() =>
                onChange({
                  ...question,
                  slots: question.slots.filter((entry) => entry.id !== slot.id),
                  answer: { slots: answers },
                })
              }
            >
              Remove blank {index + 1}
            </Button>
          </fieldset>
        );
      })}
      <Button
        type="button"
        variant="quiet"
        className="justify-self-start"
        onClick={() =>
          onChange({
            ...question,
            slots: [
              ...question.slots,
              { id: crypto.randomUUID(), options: [newOption(), newOption()] },
            ],
          })
        }
      >
        Add blank
      </Button>
    </>
  );
}

export function StructuredAnswerPreview({ question }: { question: StructuredQuestion }) {
  const [sequence, setSequence] = useState<string[]>([]);
  if (question.type === "ordering")
    return (
      <Sequence
        label="Put the steps in order"
        options={question.options}
        ids={sequence.filter((id) => filled(question.options).some((option) => option.id === id))}
        onChange={setSequence}
      />
    );
  if (question.type === "match")
    return (
      <fieldset className="grid gap-2">
        <legend className="font-semibold">Match each item</legend>
        {filled(question.left).map((left) => (
          <OptionSelect key={left.id} label={left.text} options={filled(question.right)} />
        ))}
      </fieldset>
    );
  return (
    <fieldset className="grid gap-2">
      <legend className="font-semibold">Fill the blanks</legend>
      {question.slots.map((slot, index) => (
        <OptionSelect key={slot.id} label={`Blank ${index + 1}`} options={filled(slot.options)} />
      ))}
    </fieldset>
  );
}
