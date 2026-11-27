// Critical-path bundle budgets for the static export (docs/md/09 §4).
// For each page it adds up, gzip-compressed, what a first visit must fetch
// before the page is usable: the HTML, every non-legacy <script src>,
// stylesheets, the Basic Latin webfont files those stylesheets declare, and
// preloaded fonts and images. Legacy `noModule` polyfills are skipped because
// the supported browsers never download them.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, posix, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const KIB = 1024;
const gzipSize = (buffer) => gzipSync(buffer, { level: 9 }).length;

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "_next" ? [] : htmlFiles(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

/** The local files a page needs on its critical path, grouped by kind. */
export function criticalAssets(html) {
  const assets = { js: [], css: [], other: [] };
  for (const [tag] of html.matchAll(/<script\b[^>]*>/gi)) {
    const src = /\ssrc="([^"]+)"/i.exec(tag)?.[1];
    if (src && !/\snomodule/i.test(tag)) assets.js.push(src);
  }
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const href = /\shref="([^"]+)"/i.exec(tag)?.[1];
    if (!href) continue;
    if (/\srel="stylesheet"/i.test(tag)) assets.css.push(href);
    else if (/\srel="preload"/i.test(tag) && /\sas="(font|image)"/i.test(tag))
      assets.other.push(href);
    else if (/\srel="(preload|modulepreload)"/i.test(tag) && /\sas="script"/i.test(tag))
      assets.js.push(href);
  }
  return {
    js: [...new Set(assets.js)],
    css: [...new Set(assets.css)],
    other: [...new Set(assets.other)],
  };
}

/**
 * Webfont files an English page downloads: @font-face rules with no
 * unicode-range or one that covers Basic Latin (U+0000-00FF, minified as U+??).
 */
export function latinFonts(css) {
  const urls = [];
  for (const [block] of css.matchAll(/@font-face\s*{[^}]*}/gi)) {
    const range = /unicode-range:([^;}]*)/i.exec(block)?.[1];
    if (range && !/U\+(?:\?\?|0+-0*FF)(?![0-9A-F?])/i.test(range)) continue;
    const url = /url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/i.exec(block)?.[1];
    if (url) urls.push(url);
  }
  return urls;
}

export function measurePage(outDir, file, basePath = "") {
  const html = readFileSync(file);
  const assets = criticalAssets(html.toString("utf8"));
  const pathOf = (url, from = "/") => {
    if (/^(https?:)?\/\//.test(url)) throw new Error(`${file}: third-party asset ${url}`);
    const absolute = url.startsWith("/") ? url : posix.join(posix.dirname(from), url);
    const local =
      basePath && absolute.startsWith(basePath) ? absolute.slice(basePath.length) : absolute;
    const path = join(outDir, decodeURIComponent(local.split(/[?#]/)[0]));
    if (!existsSync(path)) throw new Error(`${file}: missing asset ${url}`);
    return path;
  };
  const sizeOf = (url) => gzipSize(readFileSync(pathOf(url)));
  const js = assets.js.reduce((sum, url) => sum + sizeOf(url), 0);
  const css = assets.css.reduce((sum, url) => sum + sizeOf(url), 0);
  const fonts = new Set();
  for (const sheet of assets.css) {
    const cssPath = pathOf(sheet);
    for (const font of latinFonts(readFileSync(cssPath, "utf8"))) fonts.add(pathOf(font, sheet));
  }
  for (const url of assets.other) fonts.delete(pathOf(url));
  const other =
    assets.other.reduce((sum, url) => sum + sizeOf(url), 0) +
    [...fonts].reduce((sum, path) => sum + gzipSize(readFileSync(path)), 0);
  const page = gzipSize(html);
  return { js, css, other, html: page, total: js + css + other + page };
}

/** Returns { rows, errors, warnings } for every page in the export. */
export function checkBudgets(outDir, budgets, basePath = "") {
  if (!existsSync(outDir))
    throw new Error(`No static export at ${outDir}; build with GITHUB_PAGES=true.`);
  const rows = [];
  const errors = [];
  const warnings = [];
  for (const file of htmlFiles(outDir).sort()) {
    const page = "/" + relative(outDir, file).replaceAll("\\", "/");
    const size = measurePage(outDir, file, basePath);
    rows.push({ page, ...size });
    for (const kind of ["js", "total"]) {
      const kib = size[kind] / KIB;
      const ceiling = budgets.ceiling?.[kind] ?? budgets.target[kind];
      if (kib > ceiling)
        errors.push(`${page}: ${kind} ${kib.toFixed(1)} KiB is over the ${ceiling} KiB ceiling`);
      else if (kib > budgets.target[kind])
        warnings.push(
          `${page}: ${kind} ${kib.toFixed(1)} KiB is over the ${budgets.target[kind]} KiB budget (09 §4)`,
        );
    }
  }
  return { rows, errors, warnings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.cwd();
  const outDir = resolve(root, process.argv[2] ?? "apps/web/out");
  const budgets = JSON.parse(readFileSync(resolve(root, "apps/web/budgets.json"), "utf8"));
  const { rows, errors, warnings } = checkBudgets(
    outDir,
    budgets,
    process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  );
  const kib = (bytes) => (bytes / KIB).toFixed(1).padStart(7);
  console.log("Page".padEnd(28) + "     JS    CSS  Fonts+img HTML  Total  (gzip KiB)");
  for (const row of rows) {
    console.log(
      row.page.padEnd(28) + [row.js, row.css, row.other, row.html, row.total].map(kib).join(""),
    );
  }
  const annotate = process.env.GITHUB_ACTIONS === "true";
  for (const warning of warnings)
    console.log(annotate ? `::warning::${warning}` : `warning: ${warning}`);
  if (errors.length) {
    for (const error of errors) console.error(annotate ? `::error::${error}` : error);
    process.exitCode = 1;
  } else console.log(`Bundle budgets: ${rows.length} pages within the ceiling.`);
}
