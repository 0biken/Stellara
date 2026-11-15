import { readdir, readFile } from "node:fs/promises";
import { resolve, relative, join } from "node:path";
import { fileURLToPath } from "node:url";

const phrases = [
  "weak",
  "failed",
  "ready for",
  "guarantee",
  "don't lose",
  "hurry",
  "expo",
  "runz",
  "live question",
  "AI",
  "streak",
  "behind",
  "last chance",
  "dear parent",
  "do not reply",
  "(s)",
  "light mode",
  "dark mode",
];
const rules = phrases.map((phrase) => ({
  phrase,
  pattern:
    phrase === "(s)"
      ? /\(s\)/iu
      : new RegExp(
          `(?<![\\p{L}\\p{N}_])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")}${["guarantee", "live question", "streak"].includes(phrase) ? "s?" : ""}(?![\\p{L}\\p{N}_])`,
          "iu",
        ),
}));

async function filesIn(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? filesIn(join(directory, entry.name)) : [join(directory, entry.name)],
    ),
  );
  return files.flat().sort();
}

function stringsIn(value) {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(stringsIn);
  return [];
}

function htmlText(source) {
  const body = /<body\b[^>]*>([\s\S]*?)<\/body\s*>/i.exec(source)?.[1] ?? source;
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?(?:p|div|br|tr|td|th|li|h[1-6]|section|table)\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|nbsp|amp|apos|quot|rsquo|lsquo);/gi, (_, entity) => {
      if (/^#x/i.test(entity)) return String.fromCodePoint(parseInt(entity.slice(2), 16));
      if (entity.startsWith("#")) return String.fromCodePoint(Number(entity.slice(1)));
      return { nbsp: " ", amp: "&", apos: "'", quot: '"', rsquo: "'", lsquo: "'" }[
        entity.toLowerCase()
      ];
    });
}

/** Only static catalogue values and message-template text are copy surfaces. */
export async function checkCopy(root = process.cwd()) {
  const catalogueFiles = (await filesIn(join(root, "packages/i18n/src"))).filter((file) =>
    file.endsWith(".json"),
  );
  const templateDirectories = [
    "docs/emails/templates",
    "docs/whatsapp/templates",
    "docs/sms/templates",
    "packages/notifications/templates",
    "apps/web/templates",
  ];
  const templateFiles = (
    await Promise.all(templateDirectories.map((dir) => filesIn(join(root, dir))))
  )
    .flat()
    .filter((file) => /\.(txt|html|json)$/i.test(file));
  const violations = [];
  for (const file of [...catalogueFiles, ...templateFiles]) {
    const source = await readFile(file, "utf8");
    const texts = file.endsWith(".json")
      ? stringsIn(JSON.parse(source))
      : [file.endsWith(".html") ? htmlText(source) : source];
    for (const text of texts) {
      // Template variables are dynamic values, including names, rather than static copy.
      const normalized = text
        .replace(/\{\{[^}]*\}\}/g, "")
        .normalize("NFKC")
        .replace(/[‘’]/g, "'");
      for (const { phrase, pattern } of rules) {
        if (pattern.test(normalized))
          violations.push({
            path: relative(root, file).replaceAll("\\", "/"),
            phrase,
            message: `Forbidden copy: ${phrase}`,
          });
      }
    }
  }
  return violations;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const violations = await checkCopy(resolve(process.argv[2] ?? process.cwd()));
  for (const violation of violations) console.error(`${violation.path}: ${violation.message}`);
  process.exitCode = violations.length ? 1 : 0;
}
