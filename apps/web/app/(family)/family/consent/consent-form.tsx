"use client";

import { getCatalogue } from "@stellara/i18n";
import { Button, Toggle } from "@stellara/ui";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { getFamilyApi } from "../../../../lib/family";

type Status = "idle" | "adult-error" | "busy" | "error";

/** FAM-02: plain-words notice, purposes as separate toggles, the 18+ declaration. */
export function ConsentForm() {
  const copy = getCatalogue("en-NG");
  const router = useRouter();
  const api = getFamilyApi();
  const adultId = useId();
  const adultErrorId = useId();
  const [messages, setMessages] = useState(true);
  const [research, setResearch] = useState(false);
  const [adult, setAdult] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!adult) {
      setStatus("adult-error");
      return;
    }
    setStatus("busy");
    try {
      await api.giveConsent({
        core_learning: true,
        progress_messages: messages,
        product_research: research,
      });
      router.push("/family/add-child/");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="m-0 font-heading text-[32px] leading-[38px] font-extrabold tracking-[-0.02em]">
          {copy["consent.title"]}
        </h1>
        <p className="m-0 text-lg text-muted">{copy["consent.lead"]}</p>
        {api.mode === "preview" && (
          <p className="m-0 rounded-2xl bg-sunk px-4 py-3 text-sm">
            {copy["consent.previewNotice"]}
          </p>
        )}
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="m-0 font-heading text-xl font-bold">{copy["consent.collectTitle"]}</h2>
        <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-base">
          <li>{copy["consent.collect1"]}</li>
          <li>{copy["consent.collect2"]}</li>
          <li>{copy["consent.collect3"]}</li>
        </ul>
      </section>

      <fieldset className="m-0 flex flex-col gap-2 rounded-3xl border border-line bg-surface p-6">
        <legend className="px-1 font-heading text-xl font-bold">
          {copy["consent.purposesTitle"]}
        </legend>
        <Toggle
          id="consent-core"
          label={copy["consent.core"]}
          description={`${copy["consent.coreBody"]} ${copy["consent.required"]}.`}
          checked
          disabled
          readOnly
        />
        <Toggle
          id="consent-messages"
          label={copy["consent.messages"]}
          description={copy["consent.messagesBody"]}
          checked={messages}
          onChange={(event) => setMessages(event.target.checked)}
        />
        <Toggle
          id="consent-research"
          label={copy["consent.research"]}
          description={copy["consent.researchBody"]}
          checked={research}
          onChange={(event) => setResearch(event.target.checked)}
        />
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor={adultId} className="flex cursor-pointer items-start gap-3 text-base">
          <input
            id={adultId}
            type="checkbox"
            checked={adult}
            onChange={(event) => {
              setAdult(event.target.checked);
              if (status === "adult-error") setStatus("idle");
            }}
            aria-invalid={status === "adult-error" ? true : undefined}
            aria-describedby={status === "adult-error" ? adultErrorId : undefined}
            className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]"
          />
          <span>{copy["consent.adult"]}</span>
        </label>
        {status === "adult-error" && (
          <p id={adultErrorId} role="alert" className="m-0 text-sm text-error">
            {copy["consent.adultError"]}
          </p>
        )}
      </div>

      <div className="flex flex-col items-start gap-3">
        <Button
          type="submit"
          variant="primary"
          size="adult"
          loading={status === "busy"}
          loadingLabel={copy["consent.agree"]}
        >
          {copy["consent.agree"]}
        </Button>
        <p className="m-0 text-sm text-muted">{copy["consent.changeLater"]}</p>
        {status === "error" && (
          <p role="alert" className="m-0 text-sm text-error">
            {copy["consent.error"]}
          </p>
        )}
      </div>
    </form>
  );
}
