import { Suspense } from "react";

import { PlacementScreen } from "../../../components/child/placement-screen";

export default function Page() {
  return (
    <Suspense>
      <PlacementScreen />
    </Suspense>
  );
}
