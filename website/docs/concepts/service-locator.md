---
sidebar_position: 4
title: Service Locator
description: Why Sawdust uses globalThis + Symbol.for locators instead of module singletons.
---

# Service locator

Sawdust ships logger and RUM **service locators** so libraries outside React/Next.js can grab
the configured instance without props, providers, or a DI container.

## Bootstrap once

During app startup (`instrumentation.ts`, API entrypoint, worker bootstrap) you call
`configureLogger()` (or `createLogger()`). Those helpers promote the canonical instance **and**
sync the locator automatically — no separate `setLogger` call.

```typescript
// apps/web/src/instrumentation.ts
import { configureLogger } from '@cues/sawdust/logger'
import { datadogTransport } from '@cues/sawdust-datadog'

configureLogger({
  service: 'web',
  transports: { console: { enabled: true } },
  extraTransports: [datadogTransport({ service: 'web', logLevel: 'info', apiKey: process.env.DD_API_KEY, options: {} })],
})
// The singleton already updated the locator; the façade points at the same instance.
```

## Shared libraries retrieve the logger

Any module — even one bundled into multiple apps — calls the locator to get the live logger:

```typescript
// packages/my-shared-lib/src/doThing.ts
import { getLogger } from '@cues/sawdust'

export function doThing(taskId: string) {
  const log = getLogger().child({ component: 'doThing' })
  log.info('starting task', { taskId })
  // …work…
  log.info('task finished', { taskId })
}
```

No threading the logger through function parameters or React context — `getLogger()` always
resolves to the canonical instance chosen by bootstrap.

## Why not a module-level singleton?

That was the original design, and it broke:

- **Module variables** (`let instance = …`) work only if every consumer imports the exact same
  bundle. Browser builds and test rewiring load duplicate copies, so instances diverged.
- **Per-runtime files** (`loggerLocator.ts`, `loggerLocator.node.ts`) each held their own
  variable. Hybrid builds that pulled in both drifted.
- **RUM used direct globals** (`datadogRum`), which shared code and tests couldn't stub cleanly.

## The `createLocator` primitive

The fix: store state on `globalThis` under a **shared symbol**, so all copies mutate one slot.

```typescript
// src/createLocator.ts
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

Each service wraps it with typed helpers:

```typescript
// loggerLocator.node.ts
import { createLocator } from './createLocator'

const controls = createLocator<BaseLogger>({
  key: Symbol.for('sawdust.logger.locator'),
  createDefault: () => noopLogger,
})

export const { setLogger, getLogger, resetLoggerLocator } = {
  setLogger: (l: BaseLogger | null | undefined) => controls.set(l ?? noopLogger),
  getLogger: () => controls.get(),
  resetLoggerLocator: () => controls.reset(),
}
```

## Why `Symbol.for` matters

`Symbol.for('sawdust.logger.locator')` resolves to the **same** symbol across every runtime
instance *and* every duplicated bundle copy. A plain `Symbol()` would create a distinct key per
file, reintroducing the duplication bug. One key per service means Node, browser, and generic
modules co-exist on a single `globalThis` slot — even when Vite, Jest, or Next.js includes both
`.ts` and `.node.ts`.

## Testing

Because the locator is just global state behind a reset, tests replace it with a mock and reset:

```typescript
import { setLogger, resetLoggerLocator, noopLogger } from '@cues/sawdust'

beforeEach(() => {
  resetLoggerLocator()
  setLogger(noopLogger)
})

test('shared lib logs status', () => {
  const spy = jest.fn()
  setLogger({ ...noopLogger, info: spy })
  doThing('123')
  expect(spy).toHaveBeenCalledWith('starting task', { taskId: '123' })
})
```

## Takeaways

- Configure once at bootstrap; the locator syncs automatically.
- Shared code imports `getLogger()` / `getRumClient()` for the live instance.
- The façade (`logger`) and the locator stay in sync — upgrades are zero-downtime.
- The same recipe extends to future locators (metrics, feature flags) without reinvention.
