// Adds a hash-based Content-Security-Policy <meta> to every page of the static
// export (docs/md/07 §6). GitHub Pages cannot send response headers, so the
// policy has to travel inside the HTML. Each inline script Next.js writes into a
// page is hashed, which keeps `script-src` strict without nonces or
// 'unsafe-inline'.
//
// `frame-ancestors` is ignored (and warned about) when delivered by <meta>, so
// the static export also gets a small hashed frame guard script. Hosts that can
// send headers use `securityHeaders()` from ./security-headers.mjs as well.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { cspDirectives, serializeCsp } from "./security-headers.mjs";

/** Hides the page and breaks out when it is loaded inside someone else's frame. */
export const FRAME_GUARD =
  'if(window.top!==window.self){document.documentElement.style.display="none";try{window.top.location.replace(window.self.location.href)}catch(e){}}';

const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
const MARKER = 'data-stellara-csp=""';

export function hashScript(source) {
  return `'sha256-${createHash("sha256").update(source, "utf8").digest("base64")}'`;
}

/** Returns the page with the CSP meta and frame guard added, or unchanged if already done. */
export function applyCsp(html, env = process.env) {
  if (html.includes(MARKER)) return html;
  const guard = `<script>${FRAME_GUARD}</script>`;
  const hashes = new Set([hashScript(FRAME_GUARD)]);
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    const attributes = match[1] ?? "";
    // JSON and other data blocks are not executed and need no hash.
    if (/\stype="(?!text\/javascript|module)[^"]*"/i.test(attributes)) continue;
    hashes.add(hashScript(match[2] ?? ""));
  }
  const policy = serializeCsp(cspDirectives({ env, scriptHashes: [...hashes], meta: true }));
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}" ${MARKER}/>`;
  // The policy must come before any script, so it goes straight after the charset.
  const charset = /<meta charSet="utf-8"\/>|<meta charset="utf-8"\s*\/?>/i;
  if (charset.test(html)) return html.replace(charset, (tag) => `${tag}${meta}${guard}`);
  return html.replace(/<head>/i, `<head>${meta}${guard}`);
}

function htmlFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...htmlFiles(path));
    else if (entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

export function applyCspToExport(outDir, env = process.env) {
  if (!existsSync(outDir)) throw new Error(`No static export at ${outDir}; run next build first.`);
  const files = htmlFiles(outDir);
  for (const file of files) writeFileSync(file, applyCsp(readFileSync(file, "utf8"), env));
  return files.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.env.GITHUB_PAGES !== "true") {
    console.log("CSP meta skipped: not a static export (GITHUB_PAGES is not true).");
  } else {
    const count = applyCspToExport(resolve(process.argv[2] ?? "out"));
    console.log(`CSP meta added to ${count} static pages.`);
  }
}
