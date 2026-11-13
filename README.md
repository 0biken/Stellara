# Stellara

Learning foundations, project specifications and brand assets for Stellara for Kids. The completion
checklist is in [TASKLIST.md](TASKLIST.md); start reading at
[the documentation index](docs/md/00-index.md).

## Development

Use Node.js 22.13 or newer within the Node 22 line, matching CI, and pnpm 11.24.0.
The root `packageManager` field pins pnpm. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm check:client
pnpm dev
```

The workspace includes `apps/web`, `packages/{rules,ui,content-schema,i18n}` and
the existing docs tools. Library builds produce ESM and declarations. Rules are
pure and versioned `v0.1.0`; they receive explicit state, IDs and time. The web
shell imports catalogue strings and shared tokens, never the rules engine or
answer-bearing content schemas. Supabase directories reserve later work only.

Rules tests run all 18 required JSON fixtures, seeded properties and branch
coverage (minimum 90% across every rules source module). The schema package
exports a safe root/client entry and separate `@stellara/content-schema/server`.
The latter must never be imported into delivery code. Bundle canary checks
supplement source import boundaries; they are not a general-purpose secret scanner.

## Documentation maintenance

```sh
pnpm docs:generate
pnpm docs:check
```

Commit generated outputs alongside source edits. The Foundations check workflow rebuilds
avatars, the HTML documentation and the brand kit on every push and pull request,
and fails if any checked output changes or a new generated file is untracked.

The avatar gallery is `docs/assets/auntie-stella/preview.html`; the combined guide
is `docs/stellara-docs.html`. Graphify outputs live in `graphify-out/`; refresh with
`/graphify . --update` after source changes. Generated previews, videos and HTML
copies are excluded from graph extraction in favor of their sources.

## Human approval gates

The [foundations guide](docs/md/17-foundations-and-human-gates.md) records pending
product sign-off, academic approval and 2027 exam verification. The 74-topic tree
is a draft across five learning areas, separate from official exam-paper mappings.
[Onboarding materials](docs/authoring/onboarding-and-rights.md) and the
[unsent quote brief](docs/authoring/request-for-quote.md) prepare later coordination;
no agreements are signed or supplier quotes received by creating these documents.
Keep actual signatures, contracts and supplier evidence out of this public repository.
