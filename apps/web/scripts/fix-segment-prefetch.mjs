// Works around a Next.js 16.4 static-export mismatch: the client prefetches
// segment data from `<route>/__next.<segment>.<segment>.txt`
// (next/dist/shared/lib/segment-cache/segment-value-encoding.js,
// convertSegmentPathToStaticExportFilename), but the exporter writes
// `<route>/__next.<segment>/<segment>.txt`. On GitHub Pages every prefetch then
// 404s and logs a console error. This copies each nested file to the flat name
// the client asks for. Delete this step once Next.js writes matching names.
import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

/** The flat filename the client requests for a nested segment file, or null. */
export function flatSegmentName(routeRelativePath) {
  const parts = routeRelativePath.split(/[\\/]/);
  if (parts.length < 2 || !parts[0].startsWith("__next.") || !parts.at(-1).endsWith(".txt"))
    return null;
  return parts.join(".");
}

export function fixSegmentPrefetch(outDir) {
  if (!existsSync(outDir)) throw new Error(`No static export at ${outDir}.`);
  let copied = 0;
  for (const file of files(outDir)) {
    const rel = relative(outDir, file).split(sep);
    const at = rel.findIndex((part) => part.startsWith("__next."));
    if (at === -1 || at === rel.length - 1) continue;
    const flat = flatSegmentName(rel.slice(at).join("/"));
    if (!flat) continue;
    const target = join(outDir, ...rel.slice(0, at), flat);
    if (!existsSync(target)) {
      copyFileSync(file, target);
      copied += 1;
    }
  }
  return copied;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.env.GITHUB_PAGES === "true") {
    const copied = fixSegmentPrefetch(resolve(process.argv[2] ?? "out"));
    console.log(`Segment prefetch files: ${copied} flat copies written.`);
  }
}
