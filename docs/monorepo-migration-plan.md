# Monorepo Migration Plan

Status: **proposal / plan-only** (no code changes yet)
Target: pnpm workspaces + Turborepo, provider packages kept separate, Changesets-driven
semver + changelogs.

Drives FOLLOWUPS item *"Multi-provider support, providers kept separate."*

---

## 1. Why

Today `@cues/sawdust` is a single package. Datadog is baked into the runtime `dependencies`
(`dd-trace`, `@loglayer/transport-datadog`, `@loglayer/transport-datadog-browser-logs`,
`@loglayer/plugin-datadog-apm-trace-injector`, `datadog-transport-common`). **Every consumer
installs dd-trace even if they never touch Datadog.**

Goal: a provider-agnostic **core** plus **isolated provider packages**, each with its own
optional peer deps, independently versioned and published, so consumers pull only what they use
and new providers (OpenTelemetry, etc.) drop in without touching core.

---

## 2. Target layout

```
sawdust/
├─ pnpm-workspace.yaml
├─ turbo.json
├─ package.json                # root: private, scripts, devDeps (turbo, changesets, biome, vitest)
├─ tsconfig.base.json          # shared compiler options
├─ tsconfig.json               # solution file (references all packages)
├─ .changeset/                 # changeset config + pending changesets
├─ packages/
│  ├─ core/                    # @cues/sawdust        (provider-agnostic)
│  ├─ datadog/                 # @cues/sawdust-datadog
│  └─ otel/                    # @cues/sawdust-otel   (future, not in first migration)
└─ website/                    # docs site (workspace member, private, not published)
```

Keep the marquee name **`@cues/sawdust`** for core — least disruption to the docs, README, and
any existing imports of the core surface.

---

## 3. Package boundaries (module map)

Derived from the current `src/` tree.

### `@cues/sawdust` (packages/core) — provider-agnostic

| Concern | Modules |
|---|---|
| Façade / singleton | `logger.facade.ts`, `logger.singleton.ts`, `logger.ts`, `logger.node.ts`, `logger.web.ts`, `loggerNoop.ts` |
| Locators | `createLocator.ts`, `loggerLocator*.ts` |
| Request scope | `request-scope*.ts`, `AsyncLocalStorageContextManager.ts` |
| Core transports | `createConsoleTransport.node/web.ts`, `createPrettyTransport.ts`, `createConsolaTransport.node/web.ts`, `JsonAwareConsolaTransport.ts` |
| Core plugin | `createRuntimeTagPlugin.ts` |
| Errors / context | `formatError.ts`, `serializeError.ts`, `sanitizeRecord.ts`, `loggerUtils.ts` |
| Types | `BaseLogger`, `LoggerImplementation`, `LoggerLocator`, `LoggerOptions`, `LoggerTransportsOptions`, `LogContext`, `LogEntry`, `LogLayer`, `ConsoleTransportOptions`, `ConsolaTransportOptions`, `PrettyTerminalTransportOptions`, `ErrorWithMessage`, `BuildTransportsResult` |

Runtime deps: `loglayer`, `@loglayer/shared`, `@loglayer/transport`, `@loglayer/plugin`,
`@loglayer/transport-consola`, `@loglayer/transport-simple-pretty-terminal`, `consola`,
`serialize-error`, `type-fest`, `client-only`. **No dd-trace, no Datadog.**

### `@cues/sawdust-datadog` (packages/datadog) — Datadog provider

Subpath exports inside one provider package:

| Subpath | Modules | Deps |
|---|---|---|
| `.` (server) | `createDatadogTransport.ts`, `createDatadogTraceInjectorPlugin.ts` | `@loglayer/transport-datadog`, `datadog-transport-common`, `dd-trace`, `@loglayer/plugin-datadog-apm-trace-injector` |
| `/browser` | `createDatadogBrowserLogsTransport.ts` | `@loglayer/transport-datadog-browser-logs`; **optional peer** `@datadog/browser-logs` |
| `/rum` | `rum*.ts`, `rumLocator*.ts`, `rumNoop.ts` | **optional peer** `@datadog/browser-rum` |
| types | `DatadogTransportOptions`, `DatadogBrowserTransportOptions`, `DatadogTraceInjectionOptions`, `DatadogDebugEvent`, `Rum*` | — |

Depends on `@cues/sawdust` as a **peer dependency** (shares the core types + registry).

> **Open decision (RUM):** RUM ships inside `@cues/sawdust-datadog/rum` (grouped by provider) vs
> its own `@cues/sawdust-rum` package. Recommend keeping it under the Datadog package — RUM today
> is Datadog-only, so a standalone package would be a hollow wrapper.

---

## 4. The crux: how providers plug into core

Core currently reads `options.transports.datadog` directly, so it *imports* Datadog. That is
exactly the coupling we are removing. Core must expose a **provider contract** it can call
without importing any provider.

**Recommended: explicit transport factories (no side effects, fully tree-shakeable).**

```typescript
// before (coupled — core knows about datadog)
import { configureLogger } from '@cues/sawdust/logger'
configureLogger({
  transports: {
    console: { enabled: true },
    datadog: { enabled: true, apiKey: DD },
  },
})

// after (decoupled — consumer wires the provider)
import { configureLogger, consoleTransport } from '@cues/sawdust'
import { datadogTransport } from '@cues/sawdust-datadog'
configureLogger({
  transports: [
    consoleTransport({ enabled: true }),
    datadogTransport({ apiKey: DD }),
  ],
})
```

Core defines a `SawdustTransport` factory interface + a builder that accepts an array of
factories. Provider packages export factories that satisfy it. Core never imports a provider.

**Trade-off:** this is a **breaking API change** to the `transports` shape (object → factory
array). Alternatives considered:

- *Registry with side-effect imports* (`import '@cues/sawdust-datadog/register'`) — implicit,
  hurts tree-shaking, harder to reason about. Rejected.
- *Keep the object shape, inject provider modules* — keeps core aware of provider keys. Defeats
  the purpose. Rejected.

A thin back-compat shim can accept the old object shape and map known keys → factories during a
deprecation window (emit a warning). Optional; adds surface area.

This contract is the highest-risk design work and should be prototyped **first** (Phase 2), core
only, before splitting the Datadog code out.

---

## 5. Build & TypeScript

- **`tsconfig.base.json`** holds today's compiler options (NodeNext, strict,
  `verbatimModuleSyntax`, `declaration`, etc.). Each package extends it.
- **TS project references** — root solution `tsconfig.json` references `packages/*`; core is a
  referenced dependency of datadog. Enables incremental, ordered builds and correct cross-package
  types.
- **Per-package build** — **keep the current dual ESM+CJS `tsc` flow** (+ `postbuild-cjs.mjs`).
  *tsup was rejected:* the original build already migrated **tsup → Babel** because tsup/esbuild
  won't rewrite TS import extensions to valid `.js` for ESM runtime resolution (see the gotcha
  below). Since source uses explicit `.js` extensions, `tsc` needs no rewriting and Just Works.
  Multiple entry points (`index`, `browser`, `rum`, `.node`/`.web`) are handled by the `exports`
  map + per-variant files, exactly as today. The validated **Babel ESM build** is the fallback if
  bundling is ever required.
- **Conditional exports** — replicate the current `.node` / `.web` / `import` / `require`
  `exports` map in each package's `package.json`.

> **Why not tsup — import-extension rewriting (resolved).** The original build went
> **tsup → Babel** precisely because tsup/esbuild does **not** rewrite TS import extensions to
> valid `.js` for ESM runtime resolution (won't add `.js` to extensionless specifiers or turn
> `.ts`→`.js` / `.mts`→`.mjs`). The Babel build fixed it with a **`babel.config.cjs`**
> (`@babel/preset-typescript` + `babel-plugin-transform-rewrite-imports`); reference copy at
> `envmgr-ui/packages/sawdust/babel.config.cjs`. **Decision: keep `tsc`** — source already writes
> explicit `.js` extensions (e.g. `export * from './formatError.js'`), so no rewriting is needed
> and Phase 1 is green. If bundling is ever required, reuse that Babel ESM build; do not
> reintroduce tsup without reproducing the rewriting.

## 6. Task pipeline (Turborepo)

`turbo.json`:

```jsonc
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

Root scripts: `turbo run build`, `turbo run test`, `turbo run typecheck`, `turbo run lint`.
`^build` ensures core builds before datadog. Vitest and Biome run per-package; Biome config can
stay at root.

## 7. Versioning & changelog (Changesets)

Adopt **[@changesets/cli](https://github.com/changesets/changesets)** — the standard for pnpm
monorepos.

- **Independent versioning** (not fixed/locked). Each provider bumps on its own cadence; that is
  the whole point of separating them.
- Config: `.changeset/config.json` with `"linked": []`, `access: "public"` (or restricted per
  current `publishConfig`), base branch `main`.
- Workflow:
  1. Contributor runs `pnpm changeset` → picks affected packages + bump level (patch/minor/major)
     → writes a summary. Committed as a markdown file in `.changeset/`.
  2. **Release PR bot** — `changesets/action` in CI opens/updates a "Version Packages" PR that
     consumes changesets, bumps versions, and **generates each package's `CHANGELOG.md`**.
  3. Merging that PR runs `changeset publish` → publishes changed packages to the registry and
     tags releases.
- Optional `@changesets/changelog-github` for changelog entries that link PRs/authors.

CI: new `.github/workflows/release.yml` (Changesets action, needs `NPM_TOKEN`). Existing
`deploy-docs.yml` stays; add a root `ci.yml` that runs `turbo run lint typecheck test build` on
PRs.

> **Decided:** publish to **npm as public packages**, then flip the repo to public. Sequence:
> land the monorepo + Changesets → set each package `publishConfig.access: "public"` → first
> `changeset publish` to npm → verify installs from a clean project → make the GitHub repo public.
> Every package gets a `LICENSE` (MIT, already declared) and a populated `files`/`exports` map
> before the first publish. Reserve/confirm the `@cues` npm scope + `NPM_TOKEN` org access up
> front (scope must exist and allow public publishing).

## 8. Docs site

`website/` becomes a workspace member (`private: true`, excluded from publish/versioning). It
currently uses npm with its own `package-lock.json`. Two options:

- **Recommended:** fold it into the pnpm workspace (delete `package-lock.json`, install via pnpm),
  so one install covers everything. Update `deploy-docs.yml` to `pnpm install` + build.
- **Alternative:** keep it npm-managed and outside the workspace (list under
  `pnpm-workspace.yaml` `ignoredBuiltDependencies` / exclude), avoiding any Docusaurus/pnpm
  friction. Lowest risk, slight redundancy.

New docs pages to add after migration: a "Providers" section (core vs datadog vs otel), and an
updated Transports/Configuration reference for the factory-array API.

---

## 9. Phased execution

Each phase ends green on `lint` + `typecheck` + `test` + `build`.

**Status (branch `chore/monorepo-migration`):** Phases 1–5 ✅ done and committed; Phase 6 prep ✅
done; the actual npm publish + repo go-public remain **manual** (need `NPM_TOKEN` + the `@cues`
scope) — see the checklist after this list.

1. ✅ **Scaffold workspace** — `pnpm-workspace.yaml`, `turbo.json`, root `package.json`,
   `tsconfig.base.json` + solution config, Changesets init. Move existing package into
   `packages/core` unchanged; keep it published as `@cues/sawdust`. Verify parity (build/test
   identical to today).
2. ✅ **Provider decoupling in core** — *shipped design differs from the original "factory-array"
   sketch and is less breaking:* core keeps its `transports` object for the built-in
   console/pretty/consola, and providers plug in through the existing `extraTransports:
   LogLayerTransport[]` and `plugins: LogLayerPlugin[]` seams. Core imports **no** provider. See
   the API note below.
3. ✅ **Extract `@cues/sawdust-datadog`** — Datadog server/browser transports, trace injector, and
   RUM moved into `packages/datadog` (subpaths `.`, `/browser`, `/rum`, `/types`); optional
   `@datadog/browser-*` peers; core drops all Datadog deps + `dd-trace`. Core 57 tests, datadog 24.
4. ✅ **Versioning/CI** — `ci.yml` (turbo lint/typecheck/test/build) + `release.yml` (Changesets).
   First release publishes both at `0.1.0`; bumps thereafter via `pnpm changeset`.
5. ✅ **Docs** — new `concepts/providers` page + migration note; all Datadog/RUM samples updated to
   the provider-factory form; site builds clean.
6. 🟡 **Publish + go public** — prep ✅ (both `publishConfig.access: public`, `LICENSE` + README in
   each, repository/keywords metadata, `npm pack --dry-run` verified). **Manual remainder** (needs
   credentials/irreversible): reserve the `@cues` npm scope + add `NPM_TOKEN` repo secret → merge
   to `main` (or `pnpm release`) to publish `0.1.0` → verify a clean-project install of each
   package + subpath → **then** flip the GitHub repo public.
7. ⬜ **(Later) `@cues/sawdust-otel`** — second provider validates the seam.

> **Shipped provider API (supersedes §4's factory-array sketch).** Datadog wires through the
> existing core seams, so core keeps `transports.{console,pretty,consola}` (non-breaking for those)
> and providers pass instances in:
> ```ts
> import { configureLogger } from '@cues/sawdust/logger'
> import { datadogTransport, datadogTraceInjectorPlugin } from '@cues/sawdust-datadog'
> configureLogger({
>   transports: { console: { enabled: true } },
>   extraTransports: [datadogTransport({ service, logLevel, apiKey })],
>   plugins: [datadogTraceInjectorPlugin({ apiKey, tracer })],
> })
> ```
> Breaking only for Datadog: `transports.datadog` / `transports.datadogBrowser` /
> `datadogTraceInjection` are gone; RUM error-forwarding is opt-in via `datadogRumErrorPlugin()`.
> No back-compat shim was shipped (the object keys simply no longer exist on core options).

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Breaking `transports` API churns every consumer | Ship the back-compat object→factory shim + a written migration guide; bump core **major**. |
| `.node`/`.web` conditional exports regress per package | Snapshot-test the resolved `exports` map; keep a consumer smoke test importing each subpath under both conditions. |
| Cross-package types drift / stale builds | TS project references + `turbo ^build` ordering. |
| Peer-dep version skew (core vs datadog) | Pin core as a caret peer in datadog; document supported range; test the matrix in CI. |
| Datadog `__mocks__` break after move | Relocate mocks with the code; keep vitest aliases per package. |
| pnpm + Docusaurus friction | Fallback: keep `website/` npm-managed outside the workspace (§8 alt). |
| Publish target unconfirmed | Resolve §7 decision before `release.yml`; gate publish on `NPM_TOKEN` presence. |

---

## 11. Decisions (resolved)

1. **Transports API** — ✅ adopt the breaking **factory-array** change, with a back-compat
   object→factory shim during a deprecation window. Core bumps major.
2. **RUM packaging** — ✅ ships under **`@cues/sawdust-datadog/rum`** (grouped with the provider).
3. **Build tool** — ✅ **keep `tsc`** (dual ESM+CJS + postbuild). *Revised from tsup:* the
   original build already went **tsup → Babel** because tsup/esbuild does not rewrite TS import
   extensions for ESM resolution (see §5 gotcha + memory). Source uses explicit `.js` extensions,
   so plain `tsc` works — Phase 1 confirms it (build/typecheck/82 tests green). If bundling is ever
   needed, use the validated **Babel ESM build**, not tsup.
4. **Publish target** — ✅ **npm, public**, then flip the repo public (§7, Phase 6).
5. **Website** — ✅ fold into the pnpm workspace — but **deferred to its own step after Phase 1**
   so the live GitHub Pages deploy is never broken mid-migration. Phase 1 workspace globs
   `packages/*` only.
