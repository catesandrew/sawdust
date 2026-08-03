---
sidebar_position: 2
title: Browser
description: Configure the logger once React hydration completes, adopt runtime loggers, and read diagnostics.
---

# Browser guide

The browser build exposes the same façade. The two browser-specific concerns are **when** to
promote the logger to its final config (after hydration) and how to stay SSR-safe.

## 1. Configure once, after hydration

Call `ensureBrowserLogger()` from your first client entry (`_app.tsx`, the top-level layout, or
a hydration effect) to promote the façade to the final logger.

Core transports (`console`, `pretty`) stay under `transports`. The Datadog browser logs transport
is a provider factory from `@cues/sawdust-datadog/browser`, wired through `extraTransports`.

```typescript
// app/logger/bootstrap.ts
import { logger, configureLogger, getCurrentLoggerMeta } from '@cues/sawdust/logger'
import { datadogBrowserTransport } from '@cues/sawdust-datadog/browser'

const isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || process.env.NODE_ENV === 'development')

export function ensureBrowserLogger() {
  const meta = getCurrentLoggerMeta()
  if (meta?.stage === 'final') {
    return logger
  }

  const configured = configureLogger(
    {
      prefix: '[UI]',
      transports: {
        console: { enabled: true, appendObjectData: true },
        pretty: {
          enabled: isDev,
          runtime: 'browser',
          viewMode: 'inline',
          includeDataInBrowserConsole: true,
        },
      },
      // Datadog browser logs — provider factory. Returns undefined (safely skipped)
      // when init.clientToken is absent.
      extraTransports: [
        datadogBrowserTransport({
          service: 'my-web-app',
          environment: 'prod',
          version: '1.0.0',
          logLevel: 'info',
          enabled: !!window.__DATADOG_CLIENT_TOKEN__,
          init: {
            clientToken: window.__DATADOG_CLIENT_TOKEN__,
            forwardErrorsToLogs: true,
            sessionSampleRate: 100,
          },
        }),
      ],
    },
    { id: 'web:final', stage: 'final' },
  )

  configured.info('Browser logger fully configured')
  return configured
}
```

:::tip Mirror errors into RUM
Error-to-RUM forwarding is no longer automatic in the browser logger — it is an opt-in plugin.
Add `plugins: [datadogRumErrorPlugin()]` (from `@cues/sawdust-datadog/rum`) and wire a RUM client
via `getRumClient` / `setRumClient`. See the [RUM guide](./rum.md#forwarding-errors-to-rum-opt-in).
:::

:::tip SSR-safe mounting
In a `'use client'` provider that also renders on the server, strip transports during SSR and
re-run the full config at hydration:

```tsx
const initialOptions = isBrowser ? options : { ...options, transports: {}, plugins: [] }
const [instance, setInstance] = useState(() => configureLogger(initialOptions))

useEffect(() => {
  setInstance(configureLogger(options, { stage: 'final', id: 'browser:final' }))
}, [options])
```
:::

## 2. Adopt an external logger

When a framework instrumentation hook or third-party SDK hands you a high-quality logger, adopt
it instead of rebuilding transports:

```typescript
import { adoptExternalLogger } from '@cues/sawdust/logger'
import type { LoggerImplementation } from '@cues/sawdust'

export function adoptRuntimeLogger(externalLogger: LoggerImplementation) {
  const canonical = adoptExternalLogger(externalLogger, {
    id: 'web:runtime-adopted',
    stage: 'final',
  })
  canonical.info('Adopted runtime-supplied logger')
  return canonical
}
```

Because the singleton only upgrades when the candidate scores higher (or when forced), repeated
calls stay idempotent.

## 3. Diagnostics in a component or hook

```typescript
import { getCurrentLoggerMeta } from '@cues/sawdust/logger'

export function useLoggerDiagnostics() {
  const meta = getCurrentLoggerMeta()
  if (!meta) return { stage: 'unconfigured' as const }

  return {
    stage: meta.stage,
    transports: meta.features.transports,
    configuredAt: new Date(meta.createdAt),
    source: meta.source,
  }
}
```

Drop this into a dev panel or console command to confirm which transports are active and where
the logger was configured.
