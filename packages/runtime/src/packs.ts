import { projectItemForClient, type ClientItem } from "@stellara/content-schema/client";
import { rules_version } from "@stellara/rules";

import { packBuildRequestSchema, parseRequest, RuntimeError } from "./contracts.js";
import { recentlySeen, shuffle } from "./util.js";

import type { RuntimeDeps, SetRecord } from "./ports.js";
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

function pemToBytes(pem: string): Uint8Array {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data as BufferSource);
  return bytesToHex(new Uint8Array(digest));
}

async function signManifest(
  deps: RuntimeDeps,
  payloadBytes: Uint8Array,
): Promise<{ publicKeyPem: string; signBytes: (data: Uint8Array) => Promise<string> }> {
  void payloadBytes;
  const subtle = globalThis.crypto.subtle;
  if (deps.packSigning) {
    const der = pemToBytes(deps.packSigning.privateKeyPem);
    const key = await subtle.importKey("pkcs8", der as BufferSource, { name: "Ed25519" }, false, [
      "sign",
    ]);
    return {
      publicKeyPem: deps.packSigning.publicKeyPem,
      signBytes: async (data) => {
        const sig = await subtle.sign("Ed25519", key, data as BufferSource);
        return bytesToBase64(new Uint8Array(sig));
      },
    };
  }
  const generated = (await subtle.generateKey("Ed25519", true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const spki = await subtle.exportKey("spki", generated.publicKey);
  const pubB64 = bytesToBase64(new Uint8Array(spki));
  return {
    publicKeyPem: `-----BEGIN PUBLIC KEY-----\n${pubB64}\n-----END PUBLIC KEY-----`,
    signBytes: async (data) => {
      const sig = await subtle.sign("Ed25519", generated.privateKey, data as BufferSource);
      return bytesToBase64(new Uint8Array(sig));
    },
  };
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
    throw new RuntimeError("NO_ITEMS_AVAILABLE", {
      required: PACK_TOTAL_ITEMS,
      found: pool.length,
    });
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
      rules_version,
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

  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const sizeBytes = encoded.byteLength;
  if (sizeBytes > PACK_MAX_BYTES) {
    throw new RuntimeError("PACK_BUDGET_EXCEEDED", { size_bytes: sizeBytes, max: PACK_MAX_BYTES });
  }

  // Persist sets and server-side key exposures atomically before returning pack.
  await deps.store.transaction(async () => {
    for (const set of sets) {
      await deps.store.insertSet(set);
    }
    await deps.store.recordKeyExposure(
      child.id,
      chosen.map((i) => i.id),
    );
  });

  const sha256 = await sha256Hex(encoded);
  const signer = await signManifest(deps, encoded);
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
    public_key: signer.publicKeyPem,
  };
  const signature = await signer.signBytes(new TextEncoder().encode(JSON.stringify(manifestBody)));
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
