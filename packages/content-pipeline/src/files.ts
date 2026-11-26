import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import type { z } from "zod";

import { draftBatchSchema, type DraftBatch } from "./batch.js";

export function readJson<T>(path: string, schema: z.ZodType<T>): T {
  return schema.parse(JSON.parse(readFileSync(path, "utf8")));
}

/** Writes 2-space JSON with a trailing newline, via a temporary file and rename. */
export function writeJson(path: string, value: unknown): void {
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temp, path);
}

export function readBatch(dir: string): DraftBatch {
  return readJson(join(dir, "batch.json"), draftBatchSchema) as DraftBatch;
}

/** Topic folders under outRoot that hold a batch.json. */
export function listBatchDirs(outRoot: string): string[] {
  if (!existsSync(outRoot)) return [];
  return readdirSync(outRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(outRoot, entry.name, "batch.json")))
    .map((entry) => join(outRoot, entry.name))
    .sort();
}

/** Stems from every batch under outRoot except the one in dir. */
export function otherStems(outRoot: string, dir: string): string[] {
  return listBatchDirs(outRoot)
    .filter((other) => resolve(other) !== resolve(dir))
    .flatMap((other) => readBatch(other).items.map((item) => item.stem ?? ""));
}
