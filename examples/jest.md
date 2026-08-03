# Jest + Sawdust: Fast Setup

This guide shows how to wire Sawdust’s service locators into Jest so each test suite starts from a clean slate. Use these patterns whenever you mock the logger or Datadog RUM.

---

## 1. Resetting Between Tests

Both the logger and RUM locators expose helpers; call them in a `beforeEach/afterEach` pair so state never leaks.

```ts
import {
  setLogger,
  getLogger,
  resetLoggerLocator,
  noopLogger,
} from '@cues/sawdust'
import {
  setRumClient,
  getRumClient,
  resetRumClientLocator,
  createRumClient,
} from '@cues/sawdust/rum'

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

This guarantees the logger façade (`logger`) always delegates to a noop instance unless your test explicitly installs another one.

---

## 2. Mocking the Logger

You can stub the minimal `BaseLogger` interface or the full `LoggerImplementation`, depending on what your code calls. For utility libraries the base contract is usually enough.

```ts
function createMockLogger() {
  const calls: Array<{ level: string; args: unknown[] }> = []

  const make = (level: string) =>
    jest.fn((...args: unknown[]) => calls.push({ level, args }))

  return {
    calls,
    logger: {
      trace: make('trace'),
      debug: make('debug'),
      info: make('info'),
      warn: make('warn'),
      error: make('error'),
      fatal: make('fatal'),
      child: () => mock.logger,
    },
  }
}

test('logs during work', () => {
  const mock = createMockLogger()
  setLogger(mock.logger)

  doWork()

  expect(mock.logger.info).toHaveBeenCalledWith('work done')
})
```

Need the full fluent API? Start from `noopLogger` and use `jest.spyOn(noopLogger, 'info')` or inject a lightweight implementation that satisfies `LoggerImplementation`.

---

## 3. Mocking RUM

The RUM locator behaves the same way. Inject a noop client or stub the methods you expect to fire.

```ts
import type { RumClient } from '@cues/sawdust'

function createMockRum(): RumClient {
  return {
    init: jest.fn(),
    reset: jest.fn(),
    isEnabled: jest.fn(() => true),
    addAction: jest.fn(),
    addTiming: jest.fn(),
    addError: jest.fn(),
    startView: jest.fn(),
    stopSession: jest.fn(),
    setViewContext: jest.fn(),
    setViewName: jest.fn(),
    setUser: jest.fn(),
    clearUser: jest.fn(),
    setGlobalContext: jest.fn(),
    getGlobalContext: jest.fn(() => ({})),
    setGlobalAttribute: jest.fn(),
    removeGlobalAttribute: jest.fn(),
  }
}

beforeEach(() => {
  resetRumClientLocator()
  setRumClient(createMockRum())
})
```

---

## 4. Test Utilities

- **Spying on calls**: Because the façade always points to the current singleton, spying on `getLogger()` or `getRumClient()` gives you the live instance.
- **Temporary overrides**: Tests can invoke `setLogger(otherLogger)` or `setRumClient(otherClient)` mid-test; remember to call `reset…` afterwards to avoid leaking.
- **Async context**: When testing request-scoped logging, use `withRequestContext` with a mocked logger and assert the child calls (see `examples/request-scope.md`).

That’s it—keep resets symmetrical and the service locator stays predictable across suites.
