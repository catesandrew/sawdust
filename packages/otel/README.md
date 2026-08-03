# @cues/sawdust-otel

OpenTelemetry logs provider for [`@cues/sawdust`](https://www.npmjs.com/package/@cues/sawdust) —
a LogLayer transport that emits every log to the OpenTelemetry **Logs API**, wired through
sawdust's `extraTransports` seam.

📖 **Docs:** <https://catesandrew.github.io/sawdust/docs/concepts/providers>

## Install

```bash
pnpm add @cues/sawdust @cues/sawdust-otel
```

## Usage

You own the OpenTelemetry SDK. Register a `LoggerProvider` once at bootstrap; the transport emits
into whatever provider is globally installed.

```typescript
import { configureLogger } from '@cues/sawdust/logger'
import { otelTransport } from '@cues/sawdust-otel'

configureLogger({
  transports: { console: { enabled: true } },
  extraTransports: [otelTransport({ scopeName: 'orders-api' })],
})
```

Each sawdust log becomes an OTel `LogRecord` (severity mapped from the log level, message as the
body, structured context as attributes).

## Why it exists

It is the second provider — after `@cues/sawdust-datadog` — and exists to prove the provider seam:
a package with zero knowledge of core internals plugs a transport in through the public
`extraTransports` API alone. See the [Providers guide](https://catesandrew.github.io/sawdust/docs/concepts/providers).

## License

MIT
