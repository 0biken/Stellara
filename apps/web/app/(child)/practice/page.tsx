import { Suspense } from "react";

import { PracticeScreen } from "../../../components/child/practice-screen";

export default function Page() {
  return (
    <Suspense>
      <PracticeScreen />
    </Suspense>
  );
}
