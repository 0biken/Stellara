import { generateKeyPairSync, verify } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import { RuntimeError } from "../src/contracts.js";
import { buildPracticePack, PACK_MAX_BYTES } from "../src/packs.js";
import { submitResponses } from "../src/responses-submit.js";
import { AUTHOR, ManualClock, REVIEWER, sequentialIds } from "../src/testing/fixtures.js";
import { MemoryStore } from "../src/testing/memory-store.js";
import { SAMPLE_PRACTICE_ITEMS } from "../src/testing/sample-content.js";

import type { ChildRecord, RuntimeDeps } from "../src/ports.js";
import type { PublishedItem } from "@stellara/content-schema/server";

const P4_FRACTIONS = "00000000-0000-4000-8000-000400000001";
const CHILD_ID = "00000000-0000-4000-8000-000000000041";

describe("pack-build, budgets, Ed25519 manifest signing, and key exposure scoring", () => {
  let store: MemoryStore;
  let deps: RuntimeDeps;
  let privateKeyPem: string;
  let publicKeyPem: string;
  const T0 = 1700000000000;

  beforeEach(() => {
    store = new MemoryStore();
    const pair = generateKeyPairSync("ed25519", {
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    privateKeyPem = pair.privateKey;
    publicKeyPem = pair.publicKey;

    deps = {
      store,
      clock: new ManualClock(T0),
      ids: sequentialIds(),
      rng: { next: () => 0.5 },
      packSigning: {
        privateKeyPem,
        publicKeyPem,
      },
    };

    const child: ChildRecord = {
      id: CHILD_ID,
      timezone: "Africa/Lagos",
      exam_date: "2027-04-20",
      status: "active",
      term_id: "term-1",
      last_active_at: T0,
      year: "P4",
    };
    store.addChild(child);
    store.addItems(SAMPLE_PRACTICE_ITEMS.filter((i) => i.topic_id === P4_FRACTIONS));
  });

  it("builds a pack with 30 practice items, 3 server-registered 10-question sets, signed URL, and Ed25519-signed manifest under 120 KB", async () => {
    const result = await buildPracticePack(deps, { child_id: CHILD_ID }, { topic_id: P4_FRACTIONS });

    expect(result.pack_id).toBeDefined();
    expect(result.set_ids).toHaveLength(3);
    expect(result.size_bytes).toBeLessThanOrEqual(PACK_MAX_BYTES);
    expect(result.download_url).toContain("https://");
    expect(result.payload.items).toHaveLength(30);

    // Each of the 3 sets is registered server-side with 10 items
    for (const setId of result.set_ids) {
      const setRecord = await store.getSet(setId);
      expect(setRecord).not.toBeNull();
      expect(setRecord?.child_id).toBe(CHILD_ID);
      expect(setRecord?.kind).toBe("practice");
      expect(setRecord?.items).toHaveLength(10);
    }

    // Verify Ed25519 signature on manifest payload
    const { signature, ...manifestBody } = result.manifest;
    const verified = verify(
      null,
      Buffer.from(JSON.stringify(manifestBody)),
      publicKeyPem,
      Buffer.from(signature, "base64"),
    );
    expect(verified).toBe(true);
  });

  it("enforces the 120 KB pack budget when pack payload exceeds limit", async () => {
    const bloatedItems: PublishedItem[] = [];
    const hugeExplanation = "x".repeat(5000);
    for (let i = 0; i < 30; i++) {
      bloatedItems.push({
        id: `00000000-0000-4000-8000-0099000000${i.toString().padStart(2, "0")}`,
        version: 1,
        topic_id: "00000000-0000-4000-8000-000990000001",
        type: "single_choice",
        stem: `Bloated question ${i}`,
        stimulus_id: null,
        explanation: hugeExplanation,
        difficulty: "standard",
        tags: [],
        purpose: "practice",
        curriculum_edition: "revised_2025",
        media: [],
        exposure_count: 0,
        provenance: "original",
        author_id: AUTHOR,
        reviewer_id: REVIEWER,
        answer_verified_at: "2026-11-01T00:00:00Z",
        status: "published",
        options: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
        ],
        answer: { option_id: "a" },
      });
    }
    store.addItems(bloatedItems);

    await expect(
      buildPracticePack(
        deps,
        { child_id: CHILD_ID },
        { topic_id: "00000000-0000-4000-8000-000990000001" },
      ),
    ).rejects.toThrow(RuntimeError);
  });

  it("records key exposure server-side and forces low-confidence scoring even if client sends key_on_device: false", async () => {
    const pack = await buildPracticePack(deps, { child_id: CHILD_ID }, { topic_id: P4_FRACTIONS });
    const firstSetId = pack.set_ids[0]!;
    const firstSet = (await store.getSet(firstSetId))!;

    // Submit responses claiming key_on_device: false
    const responses = firstSet.items.map((ref, idx) => ({
      client_id: `00000000-0000-4000-8000-00000000d0${idx.toString().padStart(2, "0")}`,
      set_id: firstSetId,
      item_id: ref.item_id,
      item_version: ref.version,
      response: { choice: "a" },
      hint_shown: false,
      response_ms: 4000,
      recorded_at: new Date(T0 + 1000 * (idx + 1)).toISOString(),
      key_on_device: false, // Client tries to spoof!
    }));

    await submitResponses(deps, { child_id: CHILD_ID }, {
      responses,
      device_clock: new Date(T0 + 15000).toISOString(),
    });

    const attempts = await store.setAttempts(firstSetId);
    expect(attempts).toHaveLength(10);
    for (const attempt of attempts) {
      expect(attempt.confidence).toBe("low");
      expect(attempt.reason).toBe("offline_key");
    }
  });
});
