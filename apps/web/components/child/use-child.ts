"use client";

import { useEffect, useState } from "react";

import { getLearningApi, type ChildProfile, type LearningApi } from "../../lib/learning";

export type ChildState =
  | { status: "loading" }
  | { status: "ready"; api: LearningApi; child: ChildProfile }
  | { status: "no-child"; api: LearningApi }
  | { status: "error" };

/** Resolves the learning adapter and the child on this device. */
export function useChild(): ChildState {
  const [state, setState] = useState<ChildState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    getLearningApi()
      .then(async (api) => {
        const child = await api.getChild();
        if (live) setState(child ? { status: "ready", api, child } : { status: "no-child", api });
      })
      .catch(() => live && setState({ status: "error" }));
    return () => {
      live = false;
    };
  }, []);
  return state;
}

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const auntie = (pose: "avatar-round" | "listening" | "smiling") =>
  `${basePath}/assets/auntie-stella/auntie-stella-${pose}.svg`;

export function newClientId(): string {
  return crypto.randomUUID();
}
