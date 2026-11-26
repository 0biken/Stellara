import { Suspense } from "react";

import { ContentDetail } from "../../../../../components/admin/content-detail";

export default function ItemPage() {
  return (
    <Suspense fallback={<p>Loading question…</p>}>
      <ContentDetail kind="item" />
    </Suspense>
  );
}
