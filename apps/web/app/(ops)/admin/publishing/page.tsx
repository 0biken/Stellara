import { Suspense } from "react";

import { ContentLibrary } from "../../../../components/admin/content-library";

export default function PublishingPage() {
  return (
    <Suspense fallback={<p>Loading publishing…</p>}>
      <ContentLibrary queue="publishing" />
    </Suspense>
  );
}
