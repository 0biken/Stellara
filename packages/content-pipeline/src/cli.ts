import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { uuidSchema } from "@stellara/content-schema/client";

import { checkBatch, type CheckReport } from "./checks.js";
import { claudeDraftModel, draftTopic, type DraftModel } from "./drafter.js";
import { otherStems, readBatch, writeJson } from "./files.js";
import { reportPilot } from "./report.js";
import { applyReviewInDir, writeReviewSheet } from "./review.js";

export const USAGE = `Usage:
  draft --brief <brief.json> --author-id <uuid> [--out <dir>]
  check <topicDir> [--out <dir>]
  review-sheet <topicDir>
  apply-review <topicDir>
  report [<outRoot>]`;

class UsageError extends Error {}

/** pnpm runs package scripts from the package folder; resolve paths from where the user ran it. */
const base = () => process.env.INIT_CWD ?? process.cwd();
const path = (value: string) => resolve(base(), value);
const defaultOut = () => path("private/content-pilot");

function parseArgs(argv: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith("--")) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--"))
        throw new UsageError(`${arg} needs a value`);
      flags[arg.slice(2)] = value;
      i++;
    } else positional.push(arg);
  }
  return { positional, flags };
}

function required(flags: Record<string, string>, name: string): string {
  const value = flags[name];
  if (!value) throw new UsageError(`Missing --${name}`);
  return value;
}

export function printReport(report: CheckReport): void {
  console.log(`${report.topic_code}: ${report.ok ? "checks passed" : "checks FAILED"}`);
  for (const message of report.batch_errors) console.log(`  error: ${message}`);
  for (const message of report.batch_warnings) console.log(`  warning: ${message}`);
  for (const item of report.items) {
    console.log(
      `  ${item.key}: ${item.errors.length} errors, ${item.warnings.length} warnings, machine check ${item.machine_check.status}`,
    );
    for (const message of item.errors) console.log(`    error: ${message}`);
    for (const message of item.warnings) console.log(`    warning: ${message}`);
  }
}

export interface CliDeps {
  model?: DraftModel;
}

export async function main(argv: string[], deps: CliDeps = {}): Promise<number> {
  try {
    const [command, ...rest] = argv;
    const { positional, flags } = parseArgs(rest);
    const outRoot = flags.out ? path(flags.out) : defaultOut();
    switch (command) {
      case "draft": {
        const briefPath = path(required(flags, "brief"));
        const authorId = uuidSchema.safeParse(required(flags, "author-id"));
        if (!authorId.success) throw new UsageError("--author-id must be a UUID");
        const { dir, report } = await draftTopic({
          briefPath,
          authorId: authorId.data,
          outRoot,
          model: deps.model ?? claudeDraftModel(),
        });
        console.log(`Wrote ${dir}`);
        printReport(report);
        return report.ok ? 0 : 1;
      }
      case "check": {
        const dir = positional[0];
        if (!dir) throw new UsageError("check needs a topic folder");
        const report = checkBatch(readBatch(path(dir)), otherStems(outRoot, path(dir)));
        writeJson(resolve(path(dir), "check.json"), report);
        printReport(report);
        return report.ok ? 0 : 1;
      }
      case "review-sheet": {
        const dir = positional[0];
        if (!dir) throw new UsageError("review-sheet needs a topic folder");
        writeReviewSheet(path(dir));
        console.log(`Wrote review.md in ${path(dir)} (review.json is kept if it exists)`);
        return 0;
      }
      case "apply-review": {
        const dir = positional[0];
        if (!dir) throw new UsageError("apply-review needs a topic folder");
        const updated = applyReviewInDir(path(dir));
        const count = (status: string) => updated.items.filter((i) => i.status === status).length;
        console.log(
          `${updated.topic_code}: ${count("approved")} approved, ${count("changes_requested")} changes requested`,
        );
        return 0;
      }
      case "report": {
        const root = positional[0] ? path(positional[0]) : outRoot;
        const summary = reportPilot(root);
        console.table(summary);
        return 0;
      }
      default:
        throw new UsageError(command ? `Unknown command: ${command}` : "No command given");
    }
  } catch (error) {
    if (error instanceof UsageError) console.error(`${error.message}\n\n${USAGE}`);
    else console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
