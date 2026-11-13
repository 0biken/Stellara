# Stellara

Project specifications and brand assets for Stellara for Kids. The completion
checklist is in [TASKLIST.md](TASKLIST.md); start reading at
[the documentation index](docs/md/00-index.md).

## Documentation maintenance

Use Node.js 22, matching CI. From the repository root:

```sh
npm ci --prefix docs/tools
npm test --prefix docs/tools
npm run generate --prefix docs/tools
npm run check:generated --prefix docs/tools
```

Commit generated outputs alongside source edits. The Docs check workflow rebuilds
avatars, the HTML documentation and the brand kit on every push and pull request,
and fails if any checked output changes or a new generated file is untracked.

The avatar gallery is `docs/assets/auntie-stella/preview.html`; the combined guide
is `docs/stellara-docs.html`. Graphify outputs live in `graphify-out/`; refresh with
`/graphify . --update` after source changes. Generated previews, videos and HTML
copies are excluded from graph extraction in favor of their sources.
