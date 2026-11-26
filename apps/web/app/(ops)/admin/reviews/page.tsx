import { Suspense } from "react";

import { ContentLibrary } from "../../../../components/admin/content-library";

export default function ReviewsPage() {
  return (
    <Suspense fallback={<p>Loading reviews…</p>}>
      <ContentLibrary queue="reviews" />
    </Suspense>
  );
}
