import { getCatalogue } from "@stellara/i18n";

import { FamilyHome } from "./family-home";
import { SignedInAs } from "./signed-in-as";

export default function FamilyPage() {
  const copy = getCatalogue("en-NG");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-heading text-[32px] leading-[38px] font-extrabold tracking-[-0.02em]">
          {copy["family.title"]}
        </h1>
        <SignedInAs />
      </div>
      <FamilyHome />
    </div>
  );
}
