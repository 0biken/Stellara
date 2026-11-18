import { clientItemSchema, uuidSchema } from "@stellara/content-schema/client";
import { z } from "zod";

/** Request and response contracts for docs/md/06 §2 (`set-start`, `responses-submit`). */

const isoInstant = z.iso.datetime({ offset: true });

export const setStartRequestSchema = z.object({
  kind: z.enum(["practice", "review", "topic_assessment", "placement"]),
  topic_ids: z.array(uuidSchema).max(50).default([]),
  assignment_id: uuidSchema.nullable().default(null),
});
export type SetStartRequest = z.input<typeof setStartRequestSchema>;

export const setStartResponseSchema = z.object({
  set_id: z.string(),
  items: z.array(clientItemSchema),
  rules_version: z.string(),
});
export type SetStartResponse = z.infer<typeof setStartResponseSchema>;

export const submittedResponseSchema = z.object({
  client_id: uuidSchema,
  set_id: uuidSchema,
  item_id: uuidSchema,
  item_version: z.number().int().positive(),
  response: z.record(z.string(), z.unknown()),
  hint_shown: z.boolean(),
  response_ms: z.number().int().nonnegative(),
  recorded_at: isoInstant,
  key_on_device: z.boolean(),
});
export type SubmittedResponse = z.infer<typeof submittedResponseSchema>;

export const responsesSubmitRequestSchema = z.object({
  responses: z.array(submittedResponseSchema).min(1).max(20),
  device_clock: isoInstant,
});
export type ResponsesSubmitRequest = z.input<typeof responsesSubmitRequestSchema>;

export const lessonCheckRequestSchema = z.object({
  lesson_id: uuidSchema,
  item_id: uuidSchema,
  item_version: z.number().int().positive(),
  response: z.record(z.string(), z.unknown()),
});
export type LessonCheckRequest = z.infer<typeof lessonCheckRequestSchema>;

export const masteryCodes = [
  "not_assessed",
  "foundation",
  "developing",
  "proficient",
  "advanced",
  "mastered",
] as const;
export type MasteryCode = (typeof masteryCodes)[number];

export interface SubmitResult {
  readonly client_id: string;
  readonly is_correct: boolean;
  readonly scored: boolean;
  readonly explanation_html: string;
  /** Present only when the answer was not correct and the item has a hint ("Not quite" flow). */
  readonly hint_html?: string;
  readonly stardust: number;
}
export interface ResponsesSubmitResponse {
  readonly results: readonly SubmitResult[];
  readonly mastery_changes: readonly {
    readonly topic_id: string;
    readonly from: MasteryCode;
    readonly to: MasteryCode;
  }[];
  readonly stardust_today: number;
  readonly run_length: number;
  /** Present only when a placement check finishes in this batch. Strand-level only. */
  readonly placement?: readonly { readonly strand_id: string; readonly label: string }[];
}

export const errorCodes = {
  INVALID_REQUEST: false,
  CHILD_NOT_FOUND: false,
  CHILD_INACTIVE: false,
  KIND_NOT_SUPPORTED: false,
  NO_ITEMS_AVAILABLE: false,
  NO_REVIEWS_DUE: false,
  SET_NOT_FOUND: false,
  SET_NOT_OWNED: false,
  SET_CLOSED: false,
  ITEM_NOT_IN_SET: false,
  ITEM_VERSION_MISMATCH: false,
  LESSON_NOT_FOUND: false,
  LESSON_ITEM_NOT_IN_LESSON: false,
} as const satisfies Record<string, boolean>;
export type ErrorCode = keyof typeof errorCodes;

const messages: Record<ErrorCode, string> = {
  INVALID_REQUEST: "The request was not in the expected shape.",
  CHILD_NOT_FOUND: "This child profile was not found.",
  CHILD_INACTIVE: "This child profile is not active.",
  KIND_NOT_SUPPORTED: "This kind of set starts somewhere else.",
  NO_ITEMS_AVAILABLE: "There are not enough questions ready for this yet.",
  NO_REVIEWS_DUE: "Nothing is due for review today.",
  SET_NOT_FOUND: "This set was not found.",
  SET_NOT_OWNED: "This set belongs to someone else.",
  SET_CLOSED: "This set is already finished.",
  ITEM_NOT_IN_SET: "This question is not part of the set.",
  ITEM_VERSION_MISMATCH: "This question has changed since the set started.",
  LESSON_NOT_FOUND: "This lesson was not found or is not published yet.",
  LESSON_ITEM_NOT_IN_LESSON: "This check question is not part of the lesson.",
};

export class RuntimeError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details: unknown;
  constructor(code: ErrorCode, details?: unknown) {
    super(messages[code]);
    this.name = "RuntimeError";
    this.code = code;
    this.retryable = errorCodes[code];
    this.details = details;
  }
  toEnvelope(): { error: { code: ErrorCode; message: string; retryable: boolean } } {
    return { error: { code: this.code, message: this.message, retryable: this.retryable } };
  }
}

export function parseRequest<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new RuntimeError("INVALID_REQUEST", parsed.error.issues);
  return parsed.data;
}
