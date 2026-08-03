# Request-Scoped Logging Cheat Sheet

`withRequestContext` uses Node’s `AsyncLocalStorage` to decorate every log inside the callback with request metadata. This gives you request IDs, user IDs, or job IDs automatically without passing them down manually.

---

## 1. How It Works

- The Node build keeps an `AsyncLocalStorage` store keyed by the logger locator.
- `withRequestContext(bindings, fn)` merges `bindings` into the current store, then runs `fn`.
- Every log emitted while `fn` runs sees those bindings via `getRequestLogger()` (or indirectly via the façade).
- When `fn` finishes, the store reverts—no cleanup code required.

> **AsyncLocalStorage refresher:** Think of it as thread-local storage for Node’s event loop. Each async call chain gets its own store that flows across `await`s and callbacks.

---

## 2. Wrapping a Next.js Route Handler

```ts
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

Every log inside the callback now carries `{ requestId, userId, route: 'GET /api/data' }` merged into the context.

---

## 3. Express Middleware Example

```ts
import { withRequestContext } from '@cues/sawdust/logger'

app.use((req, res, next) => {
  const requestId = req.header('x-request-id') ?? crypto.randomUUID()
  const userId = req.header('x-user-id') ?? 'anonymous'

  withRequestContext({ requestId, userId }, () => {
    next()
  })
})

app.get('/health', (req, res) => {
  req.log.info('health check') // e.g., if you attach getRequestLogger() to req.log
  res.send('ok')
})
```

Tie it to the request by saving `getRequestLogger()` on `req.log`, or call it on demand in each handler.

---

## 4. Testing the Scope

```ts
import { withRequestContext, getRequestLogger } from '@cues/sawdust/logger'
import { setLogger, resetLoggerLocator, noopLogger } from '@cues/sawdust'

beforeEach(() => {
  resetLoggerLocator()
  setLogger(noopLogger)
})

test('runs with scoped context', () => {
  const calls: any[] = []
  setLogger({
    ...noopLogger,
    info: jest.fn((...args) => calls.push(args)),
    child: () => ({
      ...noopLogger,
      info: jest.fn((...args) => calls.push(args)),
    }),
  })

  withRequestContext({ requestId: 'test-1' }, () => {
    getRequestLogger().info('hello')
  })

  expect(calls[0][0]).toBe('hello')
})
```

The important part is to reset the locator and supply a test logger so `getRequestLogger()` has something to call.

---

## 5. Common Pitfalls

- **Create scope at the entry point only.** Wrapping nested functions can overwrite context unexpectedly. Set it once per request.
- **Always await asynchronous handlers inside `withRequestContext`.** If you forget `await`, the function returns before the async work completes and the context vanishes.
- **Beware of `process.nextTick` loops.** If code schedules work outside the handler (e.g., `setImmediate` after the response), the context may no longer exist. Propagate context manually when needed.

Armed with these patterns, you can confidently flow request metadata across any server handler, job runner, or queue worker.
