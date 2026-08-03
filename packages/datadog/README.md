# @cues/sawdust-datadog

Datadog provider for [`@cues/sawdust`](https://www.npmjs.com/package/@cues/sawdust) — server
and browser logs, RUM, and APM trace injection, wired through sawdust's `extraTransports` /
`plugins` seams.

📖 **Docs:** <https://catesandrew.github.io/sawdust/docs/concepts/providers>

## Install

```bash
pnpm add @cues/sawdust @cues/sawdust-datadog
```

`@datadog/browser-logs` and `@datadog/browser-rum` are **optional peer dependencies** — install
them only if you use the browser logs transport or RUM.

## Subpaths

| Import | Provides |
|---|---|
| `@cues/sawdust-datadog` | `datadogTransport()` (server logs), `datadogTraceInjectorPlugin()` (APM) |
| `@cues/sawdust-datadog/browser` | `datadogBrowserTransport()` |
| `@cues/sawdust-datadog/rum` | `getRumClient`, `setRumClient`, `createRumClient`, `resetRumClientLocator`, `datadogRumErrorPlugin()` |
| `@cues/sawdust-datadog/types` | Datadog + RUM type definitions |

## Server logs + APM trace injection

```typescript
import { configureLogger } from '@cues/sawdust/logger'
import { datadogTransport, datadogTraceInjectorPlugin } from '@cues/sawdust-datadog'

configureLogger({
  transports: { console: { enabled: true } },
  extraTransports: [
    datadogTransport({ service: 'orders-api', logLevel: 'info', apiKey: process.env.DD_API_KEY }),
  ],
  plugins: [
    datadogTraceInjectorPlugin({ apiKey: process.env.DD_API_KEY, tracer }),
  ],
})
```

## Browser logs + RUM

```typescript
import { configureLogger } from '@cues/sawdust/logger'
import { datadogBrowserTransport } from '@cues/sawdust-datadog/browser'
import { datadogRumErrorPlugin } from '@cues/sawdust-datadog/rum'

configureLogger({
  transports: { console: { enabled: true } },
  extraTransports: [datadogBrowserTransport({ /* init: { clientToken, ... } */ })],
  plugins: [datadogRumErrorPlugin()], // opt-in: forwards logged errors to RUM
})
```

See the [Providers guide](https://catesandrew.github.io/sawdust/docs/concepts/providers) and the
[RUM guide](https://catesandrew.github.io/sawdust/docs/guides/rum) for details.

## License

MIT
