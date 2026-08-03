# Service Locator Pattern in Sawdust

Sawdust ships logger and RUM “service locators” so libraries outside React/Next.js can grab the configured instance without props, providers, or DI containers. This note shows how the pattern fits together.

---

## 1. Bootstrap Once

During app startup (Next.js `app/layout.tsx`, API entrypoint, worker bootstrap, etc.) you typically call `createLogger()` or `configureLogger()`. Those helpers promote the canonical instance and automatically sync the service locator.

```ts
// apps/web/src/instrumentation.ts
import { createLogger } from '@cues/sawdust/logger'

createLogger({
  transports: {
    console: { enabled: true },
    datadog: { enabled: true },
  },
})

// No extra setLogger call is needed—the singleton already updated the locator.
```

Under the hood, both the Node and browser configure/adopt flows call `setLogger` when they install a new canonical instance. The Swappable façade points at the same singleton, so any code that already imported `logger` keeps working.

---

## 2. Shared Libraries Retrieve the Logger

Any TypeScript file—even one bundled into multiple apps—can call the locator to get the live logger:

```ts
// packages/my-shared-lib/src/doThing.ts
import { getLogger } from '@cues/sawdust'

export function doThing(taskId: string) {
  const log = getLogger().child({ component: 'doThing' })
  log.info('starting task', { taskId })
  // … work …
  log.info('task finished', { taskId })
}
```

There’s no need to thread the logger through function parameters or React context—`getLogger()` always resolves to the canonical instance chosen by your bootstrap code.

---

## 3. Still Compatible with the Swappable Façade

You can keep using the `logger` façade when it’s convenient:

```ts
import { logger } from '@cues/sawdust/logger'

logger.info('this uses the same underlying singleton')
```

Both `logger` and `getLogger()` resolve through the same service locator. Upgrades via `configureLogger` (or adoption) are zero-downtime.

---

## 4. Testing Shared Code

Because the locator is just module state, tests can replace it with mocks, call the function under test, then reset:

```ts
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

---

### Key Takeaways

- Create/configure the logger once during bootstrap; no extra `setLogger` call required.
- Shared code (`packages/*`, utilities, data layer) imports `getLogger()` to get the live instance.
- The Swappable façade (`logger`) and the locator stay in sync automatically.

With this flow, you avoid prop drilling, `globalThis` hacks, and framework-specific wiring while still getting structured logging everywhere.
