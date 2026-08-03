---
sidebar_position: 5
title: Testing
description: Reset the service locators, mock the logger and RUM client, and keep suites deterministic.
---

# Testing

Sawdust's service-locator design makes tests deterministic: swap in a mock, assert the calls,
reset. This works in Jest and Vitest alike — the API is identical (`jest.fn` ↔ `vi.fn`).

## Reset between tests

Both the logger and RUM locators expose reset helpers. Call them in a `beforeEach` / `afterEach`
pair so state never leaks across suites.

```typescript
import { setLogger, resetLoggerLocator, noopLogger } from '@cues/sawdust'
import { setRumClient, resetRumClientLocator, createRumClient } from '@cues/sawdust-datadog/rum'

beforeEach(() => {
  resetLoggerLocator()
  resetRumClientLocator()
  setLogger(noopLogger)
  setRumClient(createRumClient())
})

afterEach(() => {
  resetLoggerLocator()
  resetRumClientLocator()
})
```

This guarantees the `logger` façade always delegates to a noop instance unless a test explicitly
installs another one.

## Mock the logger

Stub the minimal `BaseLogger` contract or the full `LoggerImplementation`, depending on what
your code calls. For utility libraries the base contract is usually enough.

```typescript
function createMockLogger() {
  const calls: Array<{ level: string; args: unknown[] }> = []
  const make = (level: string) => (...args: unknown[]) => calls.push({ level, args })

  const logger = {
    trace: make('trace'),
    debug: make('debug'),
    info: make('info'),
    warn: make('warn'),
    error: make('error'),
    fatal: make('fatal'),
    child: () => logger,
  }
  return { calls, logger }
}

test('logs during work', () => {
  const mock = createMockLogger()
  setLogger(mock.logger)

  doWork()

  expect(mock.calls.some((c) => c.args[0] === 'work done')).toBe(true)
})
```

Need the full fluent API? Start from `noopLogger` and spy on it, or inject a lightweight
implementation that satisfies `LoggerImplementation`.

## Mock RUM

The RUM locator behaves the same way. Inject a noop client or stub the methods you expect to
fire (see the full stub in the [RUM guide](./rum.md#testing-with-mocks)).

```typescript
import { setRumClient, resetRumClientLocator } from '@cues/sawdust-datadog/rum'

beforeEach(() => {
  resetRumClientLocator()
  setRumClient(createMockRum())
})
```

## Test utilities

- **Spying on calls** — because the façade always points at the current singleton, spying on
  `getLogger()` / `getRumClient()` gives you the live instance.
- **Temporary overrides** — call `setLogger(other)` / `setRumClient(other)` mid-test; always
  `reset…` afterward to avoid leaks.
- **Async context** — when testing request-scoped logging, use `withRequestContext` with a
  mocked logger and assert the child calls (see [Request Scope](./request-scope.md#testing-the-scope)).

Keep resets symmetrical and the service locator stays predictable across suites.
