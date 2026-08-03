# Using the RUM Locator

Historically the browser build relied on Datadog’s global singleton. Sawdust now exposes `getRumClient` so any shared module can reach the configured RUM client via the service locator—matching the logger pattern.

---

## 1. Traditional Setup (for context)

```ts
import { datadogRum } from '@datadog/browser-rum'

datadogRum.init({
  clientToken: 'abc',
  applicationId: '123',
  site: 'datadoghq.com',
  service: 'environment-manager-ui',
  env: 'prod',
})

datadogRum.startSessionReplayRecording()
```

Every module had to import `datadogRum` directly or rely on globals, which made testing harder.

---

## 2. New Sawdust Flow

Bootstrap once using `getRumClient` (or `setRumClient` if you already have an instance) and let shared code resolve the same client.

```ts
// app/rum/bootstrap.ts
import { getRumClient } from '@cues/sawdust/rum'

export function ensureRum() {
  const rum = getRumClient({
    enabled: true,
    enableInDev: process.env.NEXT_PUBLIC_ENABLE_RUM === 'true',
    init: {
      clientToken: process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN!,
      applicationId: process.env.NEXT_PUBLIC_DD_APP_ID!,
      service: 'environment-manager-ui',
      env: process.env.NEXT_PUBLIC_ENVIRONMENT,
      version: process.env.NEXT_PUBLIC_APP_VERSION,
    },
  })

  rum.addAction('rum-initialized')

  return rum
}
```

Call `ensureRum()` once during browser hydration (Next.js layout effect, client entry script, etc.). The locator stores the resulting client, so subsequent calls to `getRumClient()` return the same instance.

---

## 3. Shared Library Usage

```ts
// packages/shared-metrics/src/recordFeatureUsage.ts
import { getRumClient } from '@cues/sawdust/rum'

export function recordFeatureUsage(feature: string) {
  const rum = getRumClient()

  rum.addAction('feature-used', { feature })
  rum.setGlobalAttribute('lastFeature', feature)
}
```

This module works in any consumer app without extra wiring—no more direct `datadogRum` imports.

---

## 4. Testing with Mocks

```ts
import {
  setRumClient,
  resetRumClientLocator,
  getRumClient,
} from '@cues/sawdust/rum'

beforeEach(() => {
  resetRumClientLocator()
  setRumClient({
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
  })
})

test('records feature usage', () => {
  recordFeatureUsage('search')

  const rum = getRumClient()
  expect(rum.addAction).toHaveBeenCalledWith('feature-used', { feature: 'search' })
})
```

---

### Tips

- Prefer `getRumClient(options?)` to lazy-initialize when credentials are available. Passing `options` again later re-runs `init` in place.
- If another framework hands you a RUM client, call `setRumClient(existingClient)`; the locator will keep that instance.
- Reset the locator in tests to avoid cross-suite leakage (`resetRumClientLocator()`).

With this pattern, RUM works the same way as logging: configure once, consume everywhere.
