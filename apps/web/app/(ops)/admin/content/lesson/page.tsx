import { Suspense } from "react";

import { ContentDetail } from "../../../../../components/admin/content-detail";

export default function LessonPage() {
  return (
    <Suspense fallback={<p>Loading lesson…</p>}>
      <ContentDetail kind="lesson" />
    </Suspense>
  );
}
