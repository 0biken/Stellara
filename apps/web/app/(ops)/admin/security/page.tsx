"use client";

import { SecurityPanel } from "../../../../components/admin/security-panel";
import { useStaff } from "../../../../components/admin/staff-context";

export default function SecurityPage() {
  const { api, session, refresh } = useStaff();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-bold">Account security</h1>
      <p>
        Authentication:{" "}
        {session.assurance === "aal2"
          ? "Authenticator verified"
          : "Signed in; authenticator verification available"}
        .
      </p>
      <SecurityPanel api={api} onVerified={refresh} />
    </div>
  );
}
