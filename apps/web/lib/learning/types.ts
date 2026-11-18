import type { ClientItem } from "@stellara/content-schema/client";
import type { PlacementTone, StarLevel } from "@stellara/ui";

/**
 * Web-side mirror of the learning contracts in docs/md/06 §2. The web app may not
 * import `@stellara/runtime` (it handles answer keys), so these are declared here.
 */
export type SetKind = "practice" | "review" | "topic_assessment" | "placement";

export interface ChildProfile {
  id: string;
  first_name: string;
  year?: "P4" | "P5" | "P6";
}

export interface PlacementConfig {
  year: "P4" | "P5" | "P6";
  strands: { id: string; name: string }[];
  total_questions: number;
  available: boolean;
  completed: boolean;
  completed_set_id?: string;
  active_set_id?: string;
}

export interface OwnedSet {
  set_id: string;
  kind: SetKind;
  finished_at: number | null;
  completed: boolean;
  total_items: number;
  items: ClientItem[];
  placement: { strand_id: string; label: PlacementTone }[] | null;
}

export interface SkyTopic {
  id: string;
  title: string;
  level: StarLevel;
  /** Position in the sky, as percentages. */
  x: number;
  y: number;
  /** True when a published lesson exists for this topic. */
  has_lesson?: boolean;
}

export interface SkyData {
  topics: SkyTopic[];
  links: { from: string; to: string }[];
  today: { topic_id: string; topic_title: string; questions: number; minutes: number } | null;
  first_visit: boolean;
  placement_done: boolean;
}

export type LessonCardData =
  | { kind: "explain"; body: string }
  | { kind: "worked_example"; body: string; steps: string[] }
  | { kind: "summary"; body: string }
  | { kind: "check"; item: ClientItem }
  | { kind: "try_it"; items: ClientItem[] };

export interface LessonData {
  topic_id: string;
  title: string;
  cards: LessonCardData[];
}

export interface StartedSet {
  set_id: string;
  kind: SetKind;
  items: ClientItem[];
}

/** Child answers by item type: `{ choice }` for single choice, `{ value }` for numeric. */
export type ChildResponse = Record<string, unknown>;

export interface SubmittedAnswer {
  client_id: string;
  set_id: string;
  item_id: string;
  item_version: number;
  response: ChildResponse;
  hint_shown: boolean;
  response_ms: number;
  recorded_at: string;
  key_on_device: boolean;
}

export interface AnswerResult {
  client_id: string;
  is_correct: boolean;
  scored: boolean;
  explanation_html: string;
  hint_html?: string;
  stardust: number;
}

export interface SubmitOutcome {
  results: AnswerResult[];
  mastery_changes: { topic_id: string; from: StarLevel; to: StarLevel }[];
  stardust_today: number;
  run_length: number;
  placement?: { strand_id: string; label: PlacementTone }[];
}

export interface LearningApi {
  readonly mode: "supabase" | "preview";
  getChild(): Promise<ChildProfile | null>;
  getSky(): Promise<SkyData>;
  getLesson(topicId: string): Promise<LessonData>;
  checkLessonAnswer(
    itemId: string,
    response: ChildResponse,
  ): Promise<{ is_correct: boolean; explanation_html: string }>;
  placementStrands(): Promise<{ id: string; name: string }[]>;
  placementConfig(): Promise<PlacementConfig>;
  getOwnedSet(setId: string): Promise<OwnedSet>;
  startSet(request: { kind: SetKind; topic_ids: string[] }): Promise<StartedSet>;
  submit(request: { responses: SubmittedAnswer[]; device_clock: string }): Promise<SubmitOutcome>;
  /** Preview only: opens a sample child profile on this device. */
  startPreviewChild?(profile?: Partial<ChildProfile>): Promise<ChildProfile>;
}

export type LearningErrorCode =
  | "NETWORK"
  | "NO_CHILD_SESSION"
  | "NOT_AVAILABLE"
  | "NO_ITEMS_AVAILABLE"
  | "NO_REVIEWS_DUE"
  | "SET_CLOSED"
  | "SERVER";

export class LearningError extends Error {
  constructor(
    readonly code: LearningErrorCode | (string & {}),
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = "LearningError";
  }
  get network(): boolean {
    return this.code === "NETWORK";
  }
}
