"use client";

import { Button, Dialog } from "@stellara/ui";
import { useState } from "react";

export interface ConsentWithdrawDialogProps {
  childName: string;
  onWithdraw: () => Promise<void>;
}

/**
 * Two-tap consent withdrawal control:
 * Tap 1 opens the confirmation dialog; Tap 2 confirms withdrawal.
 */
export function ConsentWithdrawDialog({ childName, onWithdraw }: ConsentWithdrawDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onWithdraw();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Withdraw consent for {childName}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Withdraw consent for ${childName}?`}
        description="Server access stops immediately. Any offline device will stop at reconnection or when its 72-hour grant expires. Resuming later requires new verified consent."
        closeLabel="Cancel"
        variant="confirm"
      >
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
            Keep active
          </Button>
          <Button variant="primary" onClick={() => void confirm()} disabled={busy}>
            {busy ? "Withdrawing…" : "Confirm withdrawal"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
