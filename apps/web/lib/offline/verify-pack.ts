import type { DownloadedPackRecord } from "./db";

export interface SignedPack {
  manifest: {
    pack_id: string;
    child_id: string;
    topic_id: string;
    set_ids: string[];
    item_ids: string[];
    size_bytes: number;
    sha256: string;
    created_at: number;
    expires_at: number;
    public_key: string;
    signature: string;
  };
  payload: {
    pack_id: string;
    child_id: string;
    topic_id: string;
    set_ids: string[];
    items: unknown[];
  };
}

const bytes = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

export async function verifyPack(
  pack: SignedPack,
  childId: string,
  trustedKey: string,
  now = Date.now(),
): Promise<DownloadedPackRecord> {
  const { signature, ...manifest } = pack.manifest;
  if (
    !trustedKey ||
    manifest.public_key !== trustedKey ||
    manifest.child_id !== childId ||
    pack.payload.child_id !== childId ||
    pack.payload.pack_id !== manifest.pack_id ||
    pack.payload.topic_id !== manifest.topic_id ||
    JSON.stringify(pack.payload.set_ids) !== JSON.stringify(manifest.set_ids) ||
    !(manifest.expires_at > now) ||
    manifest.created_at > now ||
    manifest.expires_at - manifest.created_at > 72 * 3_600_000
  )
    throw new Error("PACK_INVALID");
  const payload = encode(pack.payload);
  if (payload.byteLength !== manifest.size_bytes || payload.byteLength > 120 * 1024)
    throw new Error("PACK_INVALID");
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", payload));
  const hash = [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hash !== manifest.sha256) throw new Error("PACK_INVALID");
  const der = bytes(trustedKey.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""));
  const key = await crypto.subtle.importKey("spki", der, "Ed25519", false, ["verify"]);
  if (!(await crypto.subtle.verify("Ed25519", key, bytes(signature), encode(manifest))))
    throw new Error("PACK_INVALID");
  return {
    id: manifest.pack_id,
    child_id: childId,
    topic_id: manifest.topic_id,
    created_at: manifest.created_at,
    size_bytes: payload.byteLength,
    manifest: pack.manifest,
    pack_data: pack.payload,
    last_accessed_at: now,
  };
}
