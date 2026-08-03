---
sidebar_position: 4
title: RUM (Datadog)
description: Use the RUM service locator so any shared module can reach the configured Real User Monitoring client.
---

# RUM integration

Historically the browser build relied on Datadog's global singleton. Sawdust exposes
`getRumClient` so any shared module can reach the configured RUM client through the service
locator — matching the logger pattern.

## Traditional setup (for contrast)

```typescript
import { datadogRum } from '@datadog/browser-rum'

datadogRum.init({
  clientToken: 'abc',
  applicationId: '123',
  site: 'datadoghq.com',
  service: 'my-web-app',
  env: 'prod',
})
datadogRum.startSessionReplayRecording()
```

Every module had to import `datadogRum` directly or rely on globals, which made testing hard.

## The Sawdust flow

Bootstrap once with `getRumClient` (or `setRumClient` if you already have an instance) and let
shared code resolve the same client.

```typescript
// app/rum/bootstrap.ts
import { getRumClient } from '@cues/sawdust/rum'

export function ensureRum() {
  const rum = getRumClient({
    enabled: true,
    enableInDev: process.env.NEXT_PUBLIC_ENABLE_RUM === 'true',
    init: {
      clientToken: process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN!,
      applicationId: process.env.NEXT_PUBLIC_DD_APP_ID!,
      service: 'my-web-app',
      env: process.env.NEXT_PUBLIC_ENVIRONMENT,
      version: process.env.NEXT_PUBLIC_APP_VERSION,
    },
  })

  rum.addAction('rum-initialized')
  return rum
}
```

Call `ensureRum()` once during browser hydration. The locator stores the client, so subsequent
`getRumClient()` calls return the same instance.

## Shared-library usage

```typescript
// packages/shared-metrics/src/recordFeatureUsage.ts
import { getRumClient } from '@cues/sawdust/rum'

export function recordFeatureUsage(feature: string) {
  const rum = getRumClient()
  rum.addAction('feature-used', { feature })
  rum.setGlobalAttribute('lastFeature', feature)
}
```

No direct `datadogRum` imports; works in any consumer app without extra wiring.

## Identifying users

```typescript
import type { RumClient, RumUser } from '@cues/sawdust'

const anonymousUser: RumUser = { id, anonymousId, type: 'anonymous' }
rum.setUser(anonymousUser)
rum.setGlobalAttribute('authenticated', false)
```

## Testing with mocks

```typescript
import { setRumClient, resetRumClientLocator, getRumClient } from '@cues/sawdust/rum'

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
  expect(getRumClient().addAction).toHaveBeenCalledWith('feature-used', { feature: 'search' })
})
```

## Tips

- Prefer `getRumClient(options?)` to lazy-initialize when credentials are available. Passing
  `options` again re-runs `init` in place.
- If a framework hands you a client, call `setRumClient(existingClient)`.
- Reset the locator in tests to avoid cross-suite leakage.
