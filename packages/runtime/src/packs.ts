import { createHash, generateKeyPairSync, sign } from "node:crypto";

import { projectItemForClient, type ClientItem } from "@stellara/content-schema/client";
import { RULES_VERSION } from "@stellara/rules";

import { packBuildRequestSchema, parseRequest, RuntimeError } from "./contracts.js";
import type { RuntimeDeps, SetRecord } from "./ports.js";
import { recentlySeen, shuffle } from "./util.js";

import type { PublishedItem } from "@stellara/content-schema/server";

export const PACK_MAX_BYTES = 120 * 1024; // 120 KB
export const PACK_SET_COUNT = 3;
export const PACK_ITEMS_PER_SET = 10;
export const PACK_TOTAL_ITEMS = PACK_SET_COUNT * PACK_ITEMS_PER_SET;

export interface PackItemEntry {
  readonly item: ClientItem;
  readonly explanation: string;
  readonly hint: string | undefined;
  readonly answer: PublishedItem["answer"];
}

export interface PackPayload {
  readonly pack_id: string;
  readonly child_id: string;
  readonly topic_id: string;
  readonly set_ids: readonly string[];
  readonly items: readonly PackItemEntry[];
}

export interface PackManifestBody {
  readonly pack_id: string;
  readonly child_id: string;
  readonly topic_id: string;
  readonly set_ids: readonly string[];
  readonly item_ids: readonly string[];
  readonly size_bytes: number;
  readonly sha256: string;
  readonly created_at: number;
  readonly expires_at: number;
  readonly public_key: string;
}

export interface PackManifest extends PackManifestBody {
  readonly signature: string;
}

export interface BuildPracticePackResult {
  readonly pack_id: string;
  readonly set_ids: readonly string[];
  readonly size_bytes: number;
  readonly download_url: string;
  readonly manifest: PackManifest;
  readonly payload: PackPayload;
}

function resolveSigningKeys(deps: RuntimeDeps): { privateKeyPem: string; publicKeyPem: string } {
  if (deps.packSigning) return deps.packSigning;
  const pair = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { privateKeyPem: pair.privateKey, publicKeyPem: pair.publicKey };
}

export async function buildPracticePack(
  deps: RuntimeDeps,
  caller: { child_id: string },
  request: unknown,
): Promise<BuildPracticePackResult> {
  const req = parseRequest(packBuildRequestSchema, request);
  const now = deps.clock.now();

  const child = await deps.store.getChild(caller.child_id);
  if (!child) throw new RuntimeError("CHILD_NOT_FOUND");
  if (child.status !== "active") throw new RuntimeError("CHILD_INACTIVE");

  const rawPool = await deps.store.publishedItems([req.topic_id]);
  const pool = rawPool.filter((i) => !i.purpose || i.purpose === "practice");
  if (pool.length < PACK_TOTAL_ITEMS) {
    throw new RuntimeError("NO_ITEMS_AVAILABLE", { required: PACK_TOTAL_ITEMS, found: pool.length });
  }

  const mastery = await deps.store.getMastery(child.id, req.topic_id);
  const seen = recentlySeen([mastery], now);
  const unseen = shuffle(
    pool.filter((i) => !seen.has(i.id)),
    deps.rng,
  );
  const seenItems = shuffle(
    pool.filter((i) => seen.has(i.id)),
    deps.rng,
  );
  const chosen = [...unseen, ...seenItems].slice(0, PACK_TOTAL_ITEMS);

  const packId = deps.ids.uuid();
  const sets: SetRecord[] = [];
  for (let s = 0; s < PACK_SET_COUNT; s++) {
    const slice = chosen.slice(s * PACK_ITEMS_PER_SET, (s + 1) * PACK_ITEMS_PER_SET);
    sets.push({
      id: deps.ids.uuid(),
      child_id: child.id,
      kind: "practice",
      topic_ids: [req.topic_id],
      review_topic_ids: [],
      assignment_id: null,
      items: slice.map((i) => ({
        item_id: i.id,
        version: i.version,
        topic_id: i.topic_id,
        ...(i.purpose ? { purpose: i.purpose } : {}),
      })),
      started_at: now,
      finished_at: null,
      placement: null,
      rules_version: RULES_VERSION,
    });
  }

  const setIds = sets.map((s) => s.id);
  const payload: PackPayload = {
    pack_id: packId,
    child_id: child.id,
    topic_id: req.topic_id,
    set_ids: setIds,
    items: chosen.map((item) => ({
      item: projectItemForClient(item),
      explanation: item.explanation,
      hint: item.hint,
      answer: item.answer,
    })),
  };

  const encoded = Buffer.from(JSON.stringify(payload), "utf8");
  const sizeBytes = encoded.byteLength;
  if (sizeBytes > PACK_MAX_BYTES) {
    throw new RuntimeError("PACK_BUDGET_EXCEEDED", { size_bytes: sizeBytes, max: PACK_MAX_BYTES });
  }

  // Persist sets and server-side key exposures atomically before returning pack.
  await deps.store.transaction(async () => {
    for (const set of sets) {
      await deps.store.insertSet(set);
    }
    await deps.store.recordKeyExposure?.(
      child.id,
      chosen.map((i) => i.id),
    );
  });

  const sha256 = createHash("sha256").update(encoded).digest("hex");
  const { privateKeyPem, publicKeyPem } = resolveSigningKeys(deps);
  const manifestBody: PackManifestBody = {
    pack_id: packId,
    child_id: child.id,
    topic_id: req.topic_id,
    set_ids: setIds,
    item_ids: chosen.map((i) => i.id),
    size_bytes: sizeBytes,
    sha256,
    created_at: now,
    expires_at: now + 72 * 60 * 60 * 1000,
    public_key: publicKeyPem,
  };
  const signature = sign(null, Buffer.from(JSON.stringify(manifestBody), "utf8"), privateKeyPem).toString(
    "base64",
  );
  const manifest: PackManifest = {
    ...manifestBody,
    signature,
  };

  const downloadUrl = deps.packStorage
    ? await deps.packStorage.putPack(packId, encoded)
    : `https://storage.stellara.local/private/packs/${packId}.json?token=${sha256.slice(0, 16)}`;

  return {
    pack_id: packId,
    set_ids: setIds,
    size_bytes: sizeBytes,
    download_url: downloadUrl,
    manifest,
    payload,
  };
}
