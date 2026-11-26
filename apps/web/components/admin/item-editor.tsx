"use client";

import { Button } from "@stellara/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import {
  emptyQuestion,
  getContentStudioApi,
  itemTypeLabels,
  itemTypes,
  type DraftQuestion,
  type ItemDraft,
} from "../../lib/admin/content";

import { useStaff } from "./staff-context";
import { StructuredAnswerFields, StructuredAnswerPreview } from "./structured-question";

const field = "w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-text";

function hasAnswerContent(question: DraftQuestion): boolean {
  switch (question.type) {
    case "numeric":
      return !!question.answer;
    case "match":
      return (
        [...question.left, ...question.right].some((entry) => entry.text) ||
        question.answer.pairs.length > 0
      );
    case "cloze":
      return (
        question.slots.length > 1 ||
        question.slots.some((slot) => slot.options.some((entry) => entry.text)) ||
        question.answer.slots.length > 0
      );
    case "ordering":
      return (
        question.options.some((option) => option.text) || question.answer.option_ids.length > 0
      );
    default:
      return question.options.some((option) => option.text) || question.correctIds.length > 0;
  }
}

export function ItemEditor({ initial }: { initial: ItemDraft }) {
  const { session } = useStaff();
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const update = <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  const question = draft.question;
  const isStructured =
    question.type === "ordering" || question.type === "match" || question.type === "cloze";

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const studio = await getContentStudioApi("demo");
      const result = await studio.saveItemDraft(session, draft);
      setDraft(result);
      setSaved(result);
      if (!draft.id) router.replace(`/admin/content/item/?id=${encodeURIComponent(result.id)}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The draft could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const changeFormat = (type: DraftQuestion["type"]) => {
    if (type === question.type) return;
    if (
      (type === "single_choice" || type === "multi_choice") &&
      (question.type === "single_choice" || question.type === "multi_choice")
    ) {
      if (
        type === "single_choice" &&
        question.correctIds.length > 1 &&
        !window.confirm("Keep only the first correct option?")
      )
        return;
      update("question", {
        ...question,
        type,
        correctIds:
          type === "single_choice" ? question.correctIds.slice(0, 1) : question.correctIds,
      });
      return;
    }
    if (
      !hasAnswerContent(question) ||
      window.confirm("Changing format clears the current answer and options. Continue?")
    )
      update("question", emptyQuestion(type));
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/content/"
        className="self-start text-sm text-primary underline"
        onNavigate={(event) => {
          if (dirty && !window.confirm("Leave this question and discard unsaved changes?"))
            event.preventDefault();
        }}
      >
        ← Content library
      </Link>
      <header>
        <h1 className="font-heading text-3xl font-extrabold">
          {draft.id ? "Edit question draft" : "New question draft"}
        </h1>
        <p className="mt-2 text-sm text-muted">Demo drafts stay in this tab until you reload it.</p>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <form
          onSubmit={save}
          aria-label="Question draft"
          className="min-w-0 rounded-xl border border-line bg-surface p-5"
        >
          <fieldset disabled={saving} className="grid gap-4">
            <label>
              Title
              <input
                className={field}
                value={draft.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </label>
            <label>
              Question
              <textarea
                className={field}
                rows={3}
                value={draft.stem}
                onChange={(e) => update("stem", e.target.value)}
              />
            </label>
            <label>
              Format
              <select
                className={field}
                value={question.type}
                onChange={(e) => changeFormat(e.target.value as DraftQuestion["type"])}
              >
                {itemTypes.map((type) => (
                  <option key={type} value={type}>
                    {itemTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            {isStructured ? (
              <StructuredAnswerFields
                question={question}
                onChange={(next) => update("question", next)}
              />
            ) : question.type === "numeric" ? (
              <label>
                Correct answer
                <input
                  inputMode="decimal"
                  className={field}
                  value={question.answer}
                  onChange={(e) => update("question", { ...question, answer: e.target.value })}
                />
              </label>
            ) : (
              <fieldset className="grid gap-3">
                <legend className="mb-2 font-semibold">Answer options</legend>
                {question.options.map((option, index) => (
                  <div
                    key={option.id}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"
                  >
                    <label>
                      Option {index + 1}
                      <input
                        className={field}
                        value={option.text}
                        onChange={(e) => {
                          const value = e.target.value;
                          update("question", {
                            ...question,
                            options: question.options.map((entry) =>
                              entry.id === option.id ? { ...entry, text: value } : entry,
                            ),
                          });
                        }}
                      />
                    </label>
                    <label className="flex min-h-11 items-center gap-2">
                      <input
                        type={question.type === "single_choice" ? "radio" : "checkbox"}
                        name="correct-option"
                        aria-label={`Option ${index + 1} is correct`}
                        checked={question.correctIds.includes(option.id)}
                        onChange={(e) =>
                          update("question", {
                            ...question,
                            correctIds:
                              question.type === "single_choice"
                                ? [option.id]
                                : e.target.checked
                                  ? [...question.correctIds, option.id]
                                  : question.correctIds.filter((id) => id !== option.id),
                          })
                        }
                      />{" "}
                      Correct
                    </label>
                    <Button
                      type="button"
                      variant="text"
                      aria-label={`Remove option ${index + 1}`}
                      onClick={() =>
                        update("question", {
                          ...question,
                          options: question.options.filter((entry) => entry.id !== option.id),
                          correctIds: question.correctIds.filter((id) => id !== option.id),
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() =>
                      update("question", {
                        ...question,
                        options: [...question.options, { id: crypto.randomUUID(), text: "" }],
                      })
                    }
                  >
                    Add option
                  </Button>
                  {question.correctIds.length > 0 && (
                    <Button
                      type="button"
                      variant="text"
                      onClick={() => update("question", { ...question, correctIds: [] })}
                    >
                      Clear correct answers
                    </Button>
                  )}
                </div>
              </fieldset>
            )}
            <label>
              Hint
              <textarea
                className={field}
                value={draft.hint}
                onChange={(e) => update("hint", e.target.value)}
              />
            </label>
            <label>
              Explanation
              <textarea
                className={field}
                value={draft.explanation}
                onChange={(e) => update("explanation", e.target.value)}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                Year
                <select
                  className={field}
                  value={draft.year}
                  onChange={(e) => update("year", e.target.value as ItemDraft["year"])}
                >
                  {["P4", "P5", "P6"].map((year) => (
                    <option key={year}>{year}</option>
                  ))}
                </select>
              </label>
              <label>
                Purpose
                <select
                  className={field}
                  value={draft.purpose}
                  onChange={(e) => update("purpose", e.target.value as ItemDraft["purpose"])}
                >
                  <option value="practice">Practice</option>
                  <option value="placement">Placement</option>
                  <option value="lesson_check">Lesson check</option>
                </select>
              </label>
              <label>
                Subject
                <input
                  className={field}
                  value={draft.subject}
                  onChange={(e) => update("subject", e.target.value)}
                />
              </label>
              <label>
                Topic
                <input
                  className={field}
                  value={draft.topic}
                  onChange={(e) => update("topic", e.target.value)}
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit">Save draft</Button>
              <span role="status" className="text-sm text-muted">
                {saving
                  ? "Saving…"
                  : dirty
                    ? "Unsaved changes"
                    : saved.revision
                      ? "Draft saved"
                      : ""}
              </span>
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="mt-3 text-sm">
              {error}
            </p>
          )}
        </form>
        <section
          aria-label="Question preview"
          className="min-w-0 rounded-xl border border-line bg-surface p-5"
        >
          <h2 className="font-heading text-xl font-bold">Question preview</h2>
          <p className="mt-3 whitespace-pre-wrap break-words">
            {draft.stem || "Enter a question to preview it here."}
          </p>
          {isStructured ? (
            <div className="mt-4">
              <StructuredAnswerPreview key={question.type} question={question} />
            </div>
          ) : question.type === "numeric" ? (
            <label className="mt-4 block">
              Your answer
              <input className={field} inputMode="decimal" key={draft.id} />
            </label>
          ) : (
            <fieldset className="mt-4 grid gap-2" key={question.type}>
              <legend className="mb-2">
                {question.type === "single_choice" ? "Choose one answer" : "Choose all that apply"}
              </legend>
              {question.options
                .filter((option) => option.text.trim())
                .map((option) => (
                  <label
                    key={option.id}
                    className="flex min-w-0 gap-3 rounded-lg border border-line p-3"
                  >
                    <input
                      type={question.type === "single_choice" ? "radio" : "checkbox"}
                      name="preview-option"
                    />
                    <span className="min-w-0 break-words">{option.text}</span>
                  </label>
                ))}
            </fieldset>
          )}
          {draft.hint && (
            <details className="mt-4">
              <summary className="cursor-pointer">Show hint</summary>
              <p className="mt-2 whitespace-pre-wrap break-words">{draft.hint}</p>
            </details>
          )}
        </section>
      </div>
    </div>
  );
}
