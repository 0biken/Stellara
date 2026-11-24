// @vitest-environment node
import { expect, it } from "vitest";

import { verifyPack, type SignedPack } from "../lib/offline/verify-pack";

async function fixture() {
  const keys = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const publicKey =
    "-----BEGIN PUBLIC KEY-----\n" +
    Buffer.from(await crypto.subtle.exportKey("spki", keys.publicKey)).toString("base64") +
    "\n-----END PUBLIC KEY-----";
  const payload: SignedPack["payload"] = {
    pack_id: "pack",
    child_id: "child",
    topic_id: "topic",
    set_ids: ["set"],
    items: [],
  };
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const manifest = {
    pack_id: "pack",
    child_id: "child",
    topic_id: "topic",
    set_ids: ["set"],
    item_ids: [],
    size_bytes: encoded.byteLength,
    sha256: Buffer.from(await crypto.subtle.digest("SHA-256", encoded)).toString("hex"),
    created_at: 1000,
    expires_at: 5000,
    public_key: publicKey,
  };
  const signature = Buffer.from(
    await crypto.subtle.sign(
      "Ed25519",
      keys.privateKey,
      new TextEncoder().encode(JSON.stringify(manifest)),
    ),
  ).toString("base64");
  return {
    pack: { manifest: { ...manifest, signature }, payload } satisfies SignedPack,
    publicKey,
  };
}
it("accepts a signed pack with the pinned key", async () => {
  const { pack, publicKey } = await fixture();
  expect((await verifyPack(pack, "child", publicKey, 2000)).id).toBe("pack");
});
it("rejects sibling access, expiry, untrusted keys and altered payloads", async () => {
  const { pack, publicKey } = await fixture();
  await expect(verifyPack(pack, "sibling", publicKey, 2000)).rejects.toThrow();
  await expect(verifyPack(pack, "child", publicKey, 5000)).rejects.toThrow();
  await expect(verifyPack(pack, "child", "another key", 2000)).rejects.toThrow();
  pack.payload.items.push({ answer: "tampered" });
  await expect(verifyPack(pack, "child", publicKey, 2000)).rejects.toThrow();
});
it("rejects altered signed metadata", async () => {
  const { pack, publicKey } = await fixture();
  pack.manifest.expires_at = 6000;
  await expect(verifyPack(pack, "child", publicKey, 2000)).rejects.toThrow();
});
