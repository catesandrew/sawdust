---
sidebar_position: 3
title: Request Scope
description: Stamp every log inside a request with its context using AsyncLocalStorage.
---

# Request-scoped logging

`withRequestContext` uses Node's `AsyncLocalStorage` to decorate every log inside a callback
with request metadata — request IDs, user IDs, job IDs — automatically, without passing them
down by hand.

## How it works

- The Node build keeps an `AsyncLocalStorage` store keyed by the logger locator.
- `withRequestContext(bindings, fn)` merges `bindings` into the current store, then runs `fn`.
- Every log emitted while `fn` runs sees those bindings via `getRequestLogger()`.
- When `fn` finishes, the store reverts — no cleanup code required.

:::note AsyncLocalStorage refresher
Think of it as thread-local storage for Node's event loop. Each async call chain gets its own
store that flows across `await`s and callbacks.
:::

## Next.js route handler

```typescript
import { withRequestContext, getRequestLogger } from '@cues/sawdust/logger'
import { headers } from 'next/headers'

export async function GET(req: Request) {
  const requestId = headers().get('x-request-id') ?? crypto.randomUUID()
  const userId = headers().get('x-user-id') ?? 'anonymous'

  return withRequestContext({ requestId, userId }, async () => {
    const log = getRequestLogger().child({ route: 'GET /api/data' })
    log.info('handling request')

    const data = await fetchData()
    log.info('responding with data', { items: data.length })

    return Response.json({ data })
  })
}
```

Every log inside the callback now carries `{ requestId, userId, route: 'GET /api/data' }`.

## Express middleware

```typescript
import { withRequestContext, getRequestLogger } from '@cues/sawdust/logger'

app.use((req, res, next) => {
  const requestId = req.header('x-request-id') ?? crypto.randomUUID()
  const userId = req.header('x-user-id') ?? 'anonymous'

  withRequestContext({ requestId, userId }, () => {
    req.log = getRequestLogger() // optional: attach for handlers
    next()
  })
})

app.get('/health', (req, res) => {
  req.log.info('health check')
  res.send('ok')
})
```

## Testing the scope

Reset the locator and supply a test logger so `getRequestLogger()` has something to call.

```typescript
import { withRequestContext, getRequestLogger } from '@cues/sawdust/logger'
import { setLogger, resetLoggerLocator, noopLogger } from '@cues/sawdust'

beforeEach(() => {
  resetLoggerLocator()
  setLogger(noopLogger)
})

test('runs with scoped context', () => {
  const calls: unknown[][] = []
  setLogger({
    ...noopLogger,
    info: (...args: unknown[]) => calls.push(args),
    child: () => ({ ...noopLogger, info: (...args: unknown[]) => calls.push(args) }),
  })

  withRequestContext({ requestId: 'test-1' }, () => {
    getRequestLogger().info('hello')
  })

  expect(calls[0][0]).toBe('hello')
})
```

## Common pitfalls

- **Create scope at the entry point only.** Wrapping nested functions can overwrite context.
  Set it once per request.
- **Always `await` async handlers inside `withRequestContext`.** Forgetting `await` returns
  before the async work completes and the context vanishes.
- **Beware work scheduled outside the handler.** `setImmediate` / `process.nextTick` after the
  response may run without the context; propagate it manually if needed.

:::caution Import source
`getRequestLogger` is exported from **both** `@cues/sawdust/logger` and
`@cues/sawdust/request-scope`. Pick one source and stay consistent across a codebase.
:::
