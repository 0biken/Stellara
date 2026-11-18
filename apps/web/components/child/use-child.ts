"use client";
import { useEffect, useState } from "react";

import { childSessionChanged } from "../../lib/child-session";
import { getLearningApi, type ChildProfile, type LearningApi } from "../../lib/learning";
export type ChildState =
  | { status: "loading" }
  | { status: "ready"; api: LearningApi; child: ChildProfile }
  | { status: "no-child"; api: LearningApi }
  | { status: "error" };
export function useChild(): ChildState {
  const [state, setState] = useState<ChildState>({ status: "loading" });
  useEffect(() => {
    let generation = 0;
    const resolve = () => {
      const current = ++generation;
      getLearningApi()
        .then(async (api) => {
          const child = await api.getChild();
          if (current === generation)
            setState(child ? { status: "ready", api, child } : { status: "no-child", api });
        })
        .catch(() => current === generation && setState({ status: "error" }));
    };
    resolve();
    window.addEventListener(childSessionChanged, resolve);
    return () => {
      generation++;
      window.removeEventListener(childSessionChanged, resolve);
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
