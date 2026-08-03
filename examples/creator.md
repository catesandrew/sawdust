# Creator Pattern and Service Locators

This document captures why we replaced ad‑hoc singletons with the `createLocator` helper and how the new pattern behaves across build targets.

---

## 1. What We Had Before

- **Module-level variables**: `logger.singleton.ts` kept the canonical instance in a plain module variable, which worked as long as every consumer imported the exact same bundle. Browser builds or Jest rewiring could load duplicated copies, leading to diverging state.
- **Environment-specific files** (`loggerLocator.ts`, `loggerLocator.node.ts`, etc.) each defined their own `let instance = …` variable. When the Node and browser bundles were concatenated (or when the generic entry was imported together with the node-specific build), the instances drifted.
- **RUM originally used direct globals**: modules imported `datadogRum` and relied on the implicit singleton. Tests and shared libraries found it difficult to stub because there was no controlled entry point.

Symptoms:
- Shared libraries couldn’t rely on a consistent logger when multiple bundlers emitted separate copies.
- Tests occasionally leaked state between suites because resetting one module’s singleton didn’t touch the others.
- RUM usage fractured between the Sawdust wrapper and direct Datadog imports.

---

## 2. Goals for the New Design

✅ One canonical instance per kind of service (`logger`, `rum`).

✅ Safe across Node and browser bundles—even if a build includes both `.ts` and `.node.ts` files.

✅ Easy to reset/mimic in tests (`resetLoggerLocator`, `resetRumClientLocator`).

✅ Minimal boilerplate so future locators (e.g., metrics) copy the same recipe.

---

## 3. Enter `createLocator`

```ts
// src/createLocator.ts
export function createLocator<T>({ key, createDefault }: { key: symbol; createDefault: () => T }) {
  const g = globalThis as Record<PropertyKey, unknown>

  const getBox = (): { value: T } => {
    if (!g[key]) {
      g[key] = { value: createDefault() }
    }
    return g[key] as { value: T }
  }

  return {
    get: () => getBox().value,
    set: (value: T | null | undefined) => (getBox().value = value ?? createDefault()),
    reset: () => {
      getBox().value = createDefault()
    },
  }
}
```

Key ideas:
- **`globalThis` + `Symbol.for`**: Using a shared symbol (e.g., `Symbol.for('sawdust.logger.locator.node')`, `Symbol.for('sawdust.logger.locator.web')`) ensures every bundle, whether Node, browser, or generic, references the same slot on `globalThis`.
- **Default factory**: `createDefault` centralises the noop fallback (`noopLogger`, `createNoopRumClient`) so we never duplicate “reset to noop” logic.
- **Consistent API**: The helper returns `{ get, set, reset }`, making locators trivial to wire.

---

## 4. Migrating the Logger Locator

**Original:**

```ts
// loggerLocator.node.ts (old)
let instance: BaseLogger = noopLogger

export function setLogger(logger: BaseLogger | null | undefined) {
  instance = logger ?? noopLogger
  return instance
}

export function getLogger() {
  return instance
}

export function resetLoggerLocator() {
  instance = noopLogger
}
```

**New:**

```ts
// loggerLocator.node.ts (new)
import { createLocator } from './createLocator'

const controls = createLocator<BaseLogger>({
  key: Symbol.for('sawdust.logger.locator.node'),
  createDefault: () => noopLogger,
})

export const loggerLocator: LoggerLocator = {
  setLogger: (logger) => controls.set(logger ?? noopLogger),
  getLogger: () => controls.get(),
  resetLoggerLocator: () => controls.reset(),
}

export const { setLogger, getLogger, resetLoggerLocator } = loggerLocator
```

All environments (generic, Node, web) reuse the **same symbol key**, so they mutate identical global state—even if the files are bundled more than once.

---

## 5. Migrating RUM

RUM followed the same pattern: the locator now lives behind `createLocator`, exposing `setRumClient`, `getRumClient`, and `resetRumClientLocator`. Tests can stub the client easily, and shared code retrieves the live instance via `getRumClient()`.

**Before:** modules sometimes used `datadogRum` directly, while Sawdust exported a lazy singleton that didn’t share state with the locator.

**After:** the `rum` entry point delegates to the locator for all reads/writes, keeping Node and browser builds aligned.

---

## 6. Why Symbols Matter

- `Symbol.for('sawdust.logger.locator.*')` resolves to the same symbol across real runtime instances *and* across multiple bundle copies. Without it, each file would create distinct symbols (`Symbol()`), leading to duplicate storage.
- Choosing a single key per service means Node, browser, and generic modules co-exist cleanly. Even if Vite, Jest, or Next.js includes both `.ts` and `.node.ts`, they all point to the same `globalThis` slot.

We initially experimented with separate keys (`.node`, `.web`, `.generic`), but the duplication surfaced when hybrid builds imported more than one variant. Consolidating onto a unified key solved it.

---

## 7. Putting It All Together

1. `createLocator` gives us the storage primitive.
2. Each service-specific locator (`loggerLocator`, `rumLocator`) wraps it with typed helpers and exports a consistent API.
3. Configure/adopt flows call `set…` automatically so no caller needs manual sync.
4. Tests and examples use `reset…` to start from a clean noop baseline.

Now, any engineer looking at the code base can see the pattern once and reuse it for future singletons (metrics, feature flags, etc.) without re-inventing the wheel.
