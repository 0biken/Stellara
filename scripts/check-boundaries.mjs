import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

function sources(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", ".next", "dist"].includes(entry.name)) return [];
    const file = join(path, entry.name);
    return entry.isDirectory() ? sources(file) : /\.[cm]?[jt]sx?$/.test(file) ? [file] : [];
  });
}

/** Restrict delivery code at source as well as checking the generated bundle. */
export function checkBoundaries(root) {
  const errors = [];
  const files = ["apps/web", "packages/ui/src", "packages/i18n/src"].flatMap((path) =>
    sources(join(root, path)),
  );
  for (const file of files) {
    const ast = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      let specifier;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
        specifier = node.moduleSpecifier;
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === "require"))
      )
        specifier = node.arguments[0];
      if (specifier && ts.isStringLiteralLike(specifier)) {
        const target = specifier.text.replaceAll("\\", "/");
        if (
          /(?:@stellara\/rules(?:\/|$)|(?:^|\/)packages\/rules\/|@stellara\/content-schema\/server(?:\/|$)|(?:^|\/)content-schema\/(?:src|dist)\/server)/.test(
            target,
          )
        )
          errors.push(`${file}: forbidden delivery import ${target}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = checkBoundaries(process.cwd());
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else console.log("Delivery import boundaries passed.");
}
