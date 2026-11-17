import { Suspense } from "react";

import { LearnScreen } from "../../../components/child/learn-screen";

export default function Page() {
  return (
    <Suspense>
      <LearnScreen />
    </Suspense>
  );
}
