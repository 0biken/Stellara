import { getCatalogue } from "@stellara/i18n";

import { SignedInAs } from "./signed-in-as";

export default function FamilyHome() {
  const copy = getCatalogue("en-NG");
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-[32px] leading-[38px] font-extrabold tracking-[-0.02em]">
          {copy["family.title"]}
        </h1>
        <SignedInAs />
      </div>

      <section className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-surface p-8 sm:flex-row sm:items-center">
        <img
          src={`${basePath}/assets/auntie-stella/auntie-stella-smiling.svg`}
          alt=""
          width={96}
          height={96}
          className="st-illustration size-24 shrink-0"
        />
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="m-0 font-heading text-[22px] leading-7 font-bold">
            {copy["family.emptyChildTitle"]}
          </h2>
          <p className="m-0 text-base text-muted">{copy["family.emptyChildBody"]}</p>
          <p className="m-0 text-sm text-muted">{copy["family.addChildSoon"]}</p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex h-12 shrink-0 items-center rounded-full bg-primary px-6 font-heading font-bold text-on-primary opacity-60"
        >
          {copy["family.addChild"]}
        </button>
      </section>
    </div>
  );
}
