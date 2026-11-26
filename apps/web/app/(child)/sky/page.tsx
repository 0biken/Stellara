import { Suspense } from "react";

import { SkyScreen } from "../../../components/child/sky-screen";

export default function Page() {
  return (
    <Suspense>
      <SkyScreen />
    </Suspense>
  );
}
