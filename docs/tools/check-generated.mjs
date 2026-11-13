// Run after regenerating the committed outputs, from any repository directory.
import { execFileSync } from "node:child_process";

const paths = [
  "docs/assets/auntie-stella/", "docs/assets/logo/", "docs/html/",
  "docs/stellara-docs.html", ":(glob)brand-kit/*.html",
];
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", ...paths], { cwd: root, encoding: "utf8" }).trim();
if (status) {
  console.error("Generated outputs are out of date. Run npm run generate --prefix docs/tools and commit the results:\n" + status);
  process.exitCode = 1;
} else {
  console.log("Generated outputs are up to date.");
}
