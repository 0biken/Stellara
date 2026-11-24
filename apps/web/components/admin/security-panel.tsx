"use client";

import { Button } from "@stellara/ui";
import { useEffect, useState } from "react";

import type { AdminApi, MfaSetup } from "../../lib/admin/types";

export function SecurityPanel({ api, onVerified }: { api: AdminApi; onVerified: () => void }) {
  const [factor, setFactor] = useState<string | null>(null);
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.getMfaFactor().then(
      (id) => {
        if (active) {
          setFactor(id);
          setLoaded(true);
        }
      },
      () => {
        if (active) setError("Could not load account security. Refresh to retry.");
      },
    );
    return () => {
      active = false;
    };
  }, [api]);
  async function enroll() {
    setBusy(true);
    setError("");
    try {
      const result = await api.enrollMfa();
      setSetup(result);
      setFactor(result.id);
    } catch {
      setError("Could not set up your authenticator. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    if (!factor) return;
    setBusy(true);
    setError("");
    try {
      await api.verifyMfa(factor, code);
      setSetup(null);
      setCode("");
      onVerified();
    } catch {
      setError("That code could not be verified. Enter the current six-digit code.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="flex max-w-xl flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
      <h2 className="font-heading text-xl font-bold">Secure your staff account</h2>
      <p>Use an authenticator app to verify access to the staff workspace.</p>
      {api.mode === "demo" ? (
        <p>Account security is simulated in this demo. No real account is connected.</p>
      ) : (
        <>
          {!loaded && !error && <p role="status">Checking your authenticator…</p>}
          {loaded && !factor && (
            <Button onClick={() => void enroll()} loading={busy}>
              Set up authenticator
            </Button>
          )}
          {setup && (
            <>
              <p>Scan this code in your authenticator app, or enter the setup key manually.</p>
              {/* Provider-issued data URL; never insert SVG markup into the document. */}
              <img src={setup.qrCode} alt="Authenticator setup QR code" width={220} height={220} />
              <label>
                Setup key
                <input
                  className="block w-full rounded-lg border border-line p-3 font-mono"
                  readOnly
                  value={setup.secret}
                />
              </label>
            </>
          )}
          {factor && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void verify();
              }}
            >
              <label>
                Six-digit code
                <input
                  className="mt-2 block w-full rounded-lg border border-line bg-surface p-3"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                />
              </label>
              <Button type="submit" loading={busy}>
                Verify and continue
              </Button>
            </form>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
