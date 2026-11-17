"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getAuthAdapter } from "./index";

import type { AuthAdapter, Session } from "./types";

type SessionState =
  | { status: "loading"; session: null; adapter: AuthAdapter | null }
  | { status: "signed-in"; session: Session; adapter: AuthAdapter }
  | { status: "signed-out"; session: null; adapter: AuthAdapter };

const SessionContext = createContext<SessionState>({
  status: "loading",
  session: null,
  adapter: null,
});

function stateFor(adapter: AuthAdapter, session: Session | null): SessionState {
  return session
    ? { status: "signed-in", session, adapter }
    : { status: "signed-out", session: null, adapter };
}

export function SessionProvider({
  children,
  adapter: injected,
}: {
  children: ReactNode;
  adapter?: AuthAdapter;
}) {
  const [state, setState] = useState<SessionState>({
    status: "loading",
    session: null,
    adapter: null,
  });

  useEffect(() => {
    const adapter = injected ?? getAuthAdapter();
    let active = true;
    const unsubscribe = adapter.onChange((session) => {
      if (active) setState(stateFor(adapter, session));
    });
    adapter
      .getSession()
      .then((session) => active && setState(stateFor(adapter, session)))
      .catch(() => active && setState(stateFor(adapter, null)));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [injected]);

  return <SessionContext value={state}>{children}</SessionContext>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}
