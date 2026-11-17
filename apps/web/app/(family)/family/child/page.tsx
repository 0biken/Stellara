import { Suspense } from "react";

import { ChildSignIn } from "./child-sign-in";

export default function ChildSignInPage() {
  return (
    <Suspense>
      <ChildSignIn />
    </Suspense>
  );
}
