---
sidebar_position: 1
title: Architecture
description: How the façade, singleton, service locators, transports, and runtime builds fit together.
---

# Architecture

Sawdust is a thin, opinionated layer over [LogLayer](https://loglayer.dev). It adds four things
LogLayer does not prescribe: a **stable façade**, a **scored singleton**, **service locators**,
and **runtime-conditional builds**.

## The big picture

```mermaid
flowchart TB
  subgraph consumer["Your code"]
    A["import { logger }"]
    B["getLogger() / getRequestLogger()"]
    C["getRumClient()"]
  end

  subgraph facade["Façade layer"]
    F["logger façade<br/>(stable import)"]
  end

  subgraph core["Core singletons + locators"]
    S["logger singleton<br/>(scored, upgradeable)"]
    LL["logger locator<br/>(globalThis + Symbol.for)"]
    RL["rum locator"]
    RS["request scope<br/>(AsyncLocalStorage / stack)"]
  end

  subgraph impl["LogLayer engine"]
    LX["LogLayer instance"]
  end

  subgraph transports["Transports & plugins"]
    T1["console"]
    T2["pretty terminal"]
    T3["consola"]
    T4["datadog (server)"]
    T5["datadog-browser-logs"]
    P1["dd trace-injector plugin"]
    P2["runtime-tag plugin"]
  end

  subgraph rum["RUM"]
    RC["Datadog RUM client"]
  end

  A --> F --> S
  B --> LL --> S
  C --> RL --> RC
  B -.reads.-> RS
  S --> LX
  LX --> T1 & T2 & T3 & T4 & T5
  LX --- P1 & P2
```

- **Façade (`logger`)** — a stable object you import once. It always delegates to the current
  canonical singleton, so upgrades never break existing imports.
- **Singleton** — the canonical logger, chosen by a scoring rule (`stage` + transport richness).
  `configureLogger` / `adoptExternalLogger` propose candidates; only stronger ones win.
- **Service locators** — `globalThis` slots keyed by `Symbol.for(...)`, so every bundle copy
  (Node, web, generic) points at the same instance. Exposed as `getLogger` / `setLogger` /
  `resetLoggerLocator` and the RUM equivalents.
- **LogLayer engine** — does the actual formatting and fan-out to transports/plugins.
- **Request scope** — `AsyncLocalStorage` on Node (stack emulation on web) that merges
  per-request bindings into every log.

## Runtime-conditional builds

The package ships `.node` and `.web` variants of the runtime-sensitive modules. The `exports`
map in `package.json` resolves the correct one automatically — you import a bare specifier and
never pick a build by hand.

```mermaid
flowchart LR
  imp["import '@cues/sawdust/logger'"]
  imp --> cond{"resolver<br/>condition"}
  cond -->|browser| web["logger.web.js"]
  cond -->|node import| nodeEsm["logger.node.js"]
  cond -->|node require| nodeCjs["cjs/logger.node.js"]
  cond -->|neutral| generic["logger.js"]
```

The same split applies to `request-scope`, `rum`, and the locators. This is why
`AsyncLocalStorage` (Node-only) never leaks into a browser bundle.

## Why service locators (not module singletons)

A plain module-level `let instance` breaks when a bundler emits duplicate copies of a module —
each copy gets its own variable and the instances drift. Sawdust stores state on `globalThis`
under a **shared symbol**:

```typescript
export function createLocator<T>({ key, createDefault }: { key: symbol; createDefault: () => T }) {
  const g = globalThis as Record<PropertyKey, unknown>
  const getBox = (): { value: T } => {
    if (!g[key]) g[key] = { value: createDefault() }
    return g[key] as { value: T }
  }
  return {
    get: () => getBox().value,
    set: (v: T | null | undefined) => (getBox().value = v ?? createDefault()),
    reset: () => { getBox().value = createDefault() },
  }
}
```

Because `Symbol.for('sawdust.logger.locator')` resolves to the **same** symbol across every
bundle copy and runtime, Node, web, and generic modules all mutate one slot. See
[Service Locator](./service-locator.md) for the full rationale and migration story.

## Module map

| Concern | Modules |
|---|---|
| Façade | `logger.facade.ts`, `logger.ts` |
| Singleton + scoring | `logger.singleton.ts` |
| Locators | `createLocator.ts`, `loggerLocator*.ts`, `rumLocator*.ts` |
| Runtime builds | `*.node.ts`, `*.web.ts` |
| Request scope | `request-scope*.ts`, `AsyncLocalStorageContextManager.ts` |
| Transports | `createConsoleTransport*`, `createPrettyTransport`, `createConsolaTransport*`, `createDatadogTransport`, `createDatadogBrowserLogsTransport` |
| Plugins | `createDatadogTraceInjectorPlugin.ts`, `createRuntimeTagPlugin.ts` |
| RUM | `rum*.ts`, `createLocator.ts` |
| Errors & context | `formatError.ts`, `serializeError.ts`, `sanitizeRecord.ts`, `loggerUtils.ts` |

Continue to [Sequence Flows](./sequence-flows.md) to see these interact over time.
