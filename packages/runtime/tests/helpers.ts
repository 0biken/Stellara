import { uuidFrom } from "../src/testing/fixtures.js";

import type { SubmittedResponse } from "../src/contracts.js";

export const T0 = Date.parse("2027-01-20T10:00:00Z"); // 11:00 in Lagos
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const CHILD = uuidFrom(0xc, 1);
export const OTHER_CHILD = uuidFrom(0xc, 2);
export const TOPIC_A = uuidFrom(0x7, 1);
export const TOPIC_B = uuidFrom(0x7, 2);
export const TOPIC_C = uuidFrom(0x7, 3);
export const TOPIC_D = uuidFrom(0x7, 4);

let counter = 0;
export function clientId(): string {
  return uuidFrom(0xd, ++counter);
}

export function answer(
  setId: string,
  itemId: string,
  at: number,
  overrides: Partial<SubmittedResponse> = {},
): SubmittedResponse {
  return {
    client_id: clientId(),
    set_id: setId,
    item_id: itemId,
    item_version: 1,
    response: { choice: "a" },
    hint_shown: false,
    response_ms: 6000,
    recorded_at: new Date(at).toISOString(),
    key_on_device: false,
    ...overrides,
  };
}

export function batch(responses: SubmittedResponse[], deviceClock: number) {
  return { responses, device_clock: new Date(deviceClock).toISOString() };
}

/** Deep scan for a property name anywhere in a JSON value. */
export function hasKey(value: unknown, name: string): boolean {
  if (Array.isArray(value)) return value.some((v) => hasKey(v, name));
  if (value && typeof value === "object")
    return Object.entries(value).some(([k, v]) => k === name || hasKey(v, name));
  return false;
}
