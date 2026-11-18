"use client";

import { formatMessage, getCatalogue } from "@stellara/i18n";
import {
  Button,
  Field,
  Picture,
  PictureKey,
  Select,
  TextInput,
  pictureIds,
  type PictureId,
} from "@stellara/ui";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";

import {
  FamilyError,
  getFamilyApi,
  isValidFirstName,
  schoolYears,
  type SchoolYear,
} from "../../../../lib/family";

type Step = "details" | "key" | "confirm";
type Goal = "common_entrance" | "school_work";

/** FAM-03: first name, school year, goal and picture; then the picture key, chosen twice. */
export function AddChildForm() {
  const copy = getCatalogue("en-NG");
  const router = useRouter();
  const api = getFamilyApi();
  const avatarLegendId = useId();
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [year, setYear] = useState<SchoolYear>("P5");
  const [goal, setGoal] = useState<Goal>("common_entrance");
  const [examDate, setExamDate] = useState("");
  const [avatar, setAvatar] = useState<PictureId>("kite");
  const [firstKey, setFirstKey] = useState<PictureId[]>([]);
  const [mismatch, setMismatch] = useState(false);
  const [keyRound, setKeyRound] = useState(0);
  const [status, setStatus] = useState<"idle" | "busy" | "error">("idle");

  useEffect(() => {
    let live = true;
    api
      .getConsent()
      .then((consent) => {
        if (live && !consent) router.replace("/family/consent/");
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [api, router]);

  const pictureLabels = Object.fromEntries(
    pictureIds.map((id) => [id, copy[`pictureKey.${id}` as keyof typeof copy]]),
  ) as Record<PictureId, string>;

  const keyProps = {
    labels: pictureLabels,
    prompt: copy["pictureKey.prompt"],
    enteredLabel: (count: number) => formatMessage("pictureKey.progress", { count }),
    removeLabel: copy["pictureKey.removeLast"],
    clearLabel: copy["pictureKey.reset"],
  };

  const toKey = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidFirstName(name)) {
      setNameError(true);
      return;
    }
    setStep("key");
  };

  const save = async (pin: PictureId[]) => {
    if (pin.join() !== firstKey.join()) {
      setMismatch(true);
      setFirstKey([]);
      setKeyRound((n) => n + 1);
      setStep("key");
      return;
    }
    setStatus("busy");
    try {
      await api.addChild({
        first_name: name,
        year,
        exam_date: goal === "common_entrance" && examDate ? examDate : null,
        avatar_key: avatar,
        pin,
      });
      router.push("/family/");
    } catch (error) {
      if (error instanceof FamilyError && error.code === "CONSENT_REQUIRED") {
        router.replace("/family/consent/");
        return;
      }
      setStatus("error");
    }
  };

  const heading = (
    <header className="flex flex-col gap-2">
      <p className="m-0 text-sm font-semibold text-muted">
        {
          copy[
            step === "details"
              ? "addChild.stepDetails"
              : step === "key"
                ? "addChild.stepKey"
                : "addChild.stepConfirm"
          ]
        }
      </p>
      <h1 className="m-0 font-heading text-[32px] leading-[38px] font-extrabold tracking-[-0.02em]">
        {copy["addChild.title"]}
      </h1>
    </header>
  );

  if (step === "details") {
    return (
      <form onSubmit={toKey} noValidate className="flex flex-col gap-6">
        {heading}
        <Field
          id="child-name"
          label={copy["addChild.nameLabel"]}
          help={copy["addChild.nameHelp"]}
          {...(nameError ? { error: copy["addChild.nameError"] } : {})}
        >
          <TextInput
            id="child-name"
            help={copy["addChild.nameHelp"]}
            {...(nameError ? { error: copy["addChild.nameError"] } : {})}
            value={name}
            autoComplete="off"
            maxLength={30}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(false);
            }}
          />
        </Field>

        <Field id="child-year" label={copy["addChild.yearLabel"]}>
          <Select
            id="child-year"
            value={year}
            onChange={(event) => setYear(event.target.value as SchoolYear)}
          >
            {schoolYears.map((value) => (
              <option key={value} value={value}>
                {copy[`addChild.year${value}` as const]}
              </option>
            ))}
          </Select>
        </Field>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 text-[15px] font-semibold">{copy["addChild.goalLabel"]}</legend>
          {(["common_entrance", "school_work"] as const).map((value) => (
            <label key={value} className="flex cursor-pointer items-center gap-3 text-base">
              <input
                type="radio"
                name="goal"
                value={value}
                checked={goal === value}
                onChange={() => setGoal(value)}
                className="size-5 accent-[var(--color-primary)]"
              />
              {
                copy[
                  value === "common_entrance"
                    ? "addChild.goalCommonEntrance"
                    : "addChild.goalSchoolWork"
                ]
              }
            </label>
          ))}
        </fieldset>

        {goal === "common_entrance" && (
          <Field
            id="child-exam"
            label={copy["addChild.examDateLabel"]}
            help={copy["addChild.examDateHelp"]}
          >
            <TextInput
              id="child-exam"
              type="date"
              help={copy["addChild.examDateHelp"]}
              value={examDate}
              onChange={(event) => setExamDate(event.target.value)}
            />
          </Field>
        )}

        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" aria-labelledby={avatarLegendId}>
          <legend id={avatarLegendId} className="mb-1.5 text-[15px] font-semibold">
            {copy["addChild.avatarLabel"]}
          </legend>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-9">
            {pictureIds.map((id) => (
              <label
                key={id}
                className={`st-press grid aspect-square cursor-pointer place-items-center rounded-2xl border-2 ${
                  avatar === id ? "border-primary bg-primary-tint" : "border-line bg-surface"
                }`}
              >
                <input
                  type="radio"
                  name="avatar"
                  value={id}
                  checked={avatar === id}
                  onChange={() => setAvatar(id)}
                  aria-label={pictureLabels[id]}
                  className="sr-only"
                />
                <Picture id={id} size={40} />
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" size="adult">
            {copy["addChild.next"]}
          </Button>
          <Button variant="quiet" size="adult" onClick={() => router.push("/family/")}>
            {copy["addChild.back"]}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {heading}
      <p className="m-0 text-lg">
        {copy[step === "key" ? "addChild.keyBody" : "addChild.confirmBody"]}
      </p>
      {mismatch && step === "key" && (
        <p role="alert" className="m-0 text-base font-medium text-error">
          {copy["addChild.keyMismatch"]}
        </p>
      )}
      {status === "busy" ? (
        <p role="status" className="m-0 text-base text-muted">
          {copy["addChild.saving"]}
        </p>
      ) : (
        <PictureKey
          key={`${step}-${keyRound}`}
          {...keyProps}
          onComplete={(sequence) => {
            const pin = [...sequence] as PictureId[];
            if (step === "key") {
              setFirstKey(pin);
              setMismatch(false);
              setStep("confirm");
            } else {
              void save(pin);
            }
          }}
        />
      )}
      {status === "error" && (
        <p role="alert" className="m-0 text-base text-error">
          {copy["addChild.error"]}
        </p>
      )}
      <Button
        variant="text"
        size="adult"
        className="self-start"
        onClick={() => {
          setFirstKey([]);
          setMismatch(false);
          setStatus("idle");
          setStep("details");
        }}
      >
        {copy["addChild.back"]}
      </Button>
    </div>
  );
}
