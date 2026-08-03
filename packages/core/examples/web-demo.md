# Browser Logger Demo Snippets

The following snippets illustrate how to exercise the singleton-based façade inside a client application (Next.js, Remix, vanilla SPA, etc.).

## 1. Configure Once, Anywhere

```typescript
// app/logger/bootstrap.ts
import {
  logger,
  configureLogger,
  getCurrentLoggerMeta,
} from '@cues/sawdust/logger'

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
        datadogBrowser: {
          enabled: !!window.__DATADOG_CLIENT_TOKEN__,
          options: {
            forwardErrorsToLogs: true,
            service: 'environment-manager-ui',
          },
        },
      },
    },
    { id: 'web:final', stage: 'final' },
  )

  configured.info('Browser logger fully configured', {
    transports: configured.getLoggerInstance('console') ? 'console' : 'unknown',
  })

  return configured
}
```

Call `ensureBrowserLogger()` from the first client entry (e.g., `_app.tsx`, top-level layout, or a hydration effect) to promote the façade to the final logger.

## 2. Adopt an External Logger

When a Next.js instrumentation hook or third-party SDK provides a high-quality logger, adopt it instead of rebuilding transports:

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

Because the singleton only upgrades when the candidate scores higher (or when forced), repeated calls stay idempotent.

## 3. Introspection for Diagnostics

```typescript
import { getCurrentLoggerMeta } from '@cues/sawdust/logger'

export function useLoggerDiagnostics() {
  const meta = getCurrentLoggerMeta()
  if (!meta) {
    return { stage: 'unconfigured' as const }
  }

  return {
    stage: meta.stage,
    transports: meta.features.transports,
    configuredAt: new Date(meta.createdAt),
    source: meta.source,
  }
}
```

Drop this into a React component or developer console command to confirm which transports are active and where the logger was configured.

---

Need a full-stack demo? Pair these snippets with the [`node-demo.ts`](./node-demo.ts) script for a complete story across server and client runtimes.
