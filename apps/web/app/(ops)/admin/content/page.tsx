import { Suspense } from "react";

import { ContentLibrary } from "../../../../components/admin/content-library";

export default function ContentPage() {
  return (
    <Suspense fallback={<p>Loading library…</p>}>
      <ContentLibrary />
    </Suspense>
  );
}
