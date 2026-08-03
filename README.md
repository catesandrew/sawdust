# Sawdust

Monorepo for **`@cues/sawdust`** — a runtime-agnostic logging + RUM toolkit for Node.js, the
browser, and workers, built on [LogLayer](https://loglayer.dev).

📖 **Documentation:** <https://catesandrew.github.io/sawdust/>

## Packages

| Package | Path | Description |
|---|---|---|
| [`@cues/sawdust`](./packages/core) | `packages/core` | Provider-agnostic core: façade, singleton, locators, request scope, console/pretty/consola transports. |

> Provider packages (`@cues/sawdust-datadog`, future `@cues/sawdust-otel`) are being split out —
> see the [monorepo migration plan](./docs/monorepo-migration-plan.md).

## Development

```bash
pnpm install          # install the whole workspace
pnpm build            # turbo: build every package
pnpm test             # turbo: run every package's tests
pnpm typecheck        # turbo: type-check every package
pnpm lint             # turbo: lint every package
```

Tooling: pnpm workspaces · Turborepo · Changesets · Biome · Vitest · TypeScript (NodeNext).

## Releasing

Versioning and changelogs are managed by [Changesets](https://github.com/changesets/changesets):

```bash
pnpm changeset        # record a change (bump level + summary)
```

The docs site lives in [`website/`](./website) and deploys to GitHub Pages via
`.github/workflows/deploy-docs.yml`.
