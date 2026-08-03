# @cues/sawdust

Runtime-agnostic logging toolkit for shared browser, Node.js, and worker runtimes with singleton-driven orchestration and pluggable transports, built on [LogLayer](https://loglayer.dev).

📖 **Documentation:** <https://catesandrew.github.io/sawdust/> — getting started, guides, architecture with sequence diagrams, and the full pattern catalog. Source lives in [`website/`](./website).

## Features

- Unified logging API shared across Node.js, browsers, and background workers.
- Singleton-backed façade that upgrades in place while preserving façade imports.
- Rich metadata branding for logger instances (stage, priority, transports, trace).
- Optional Datadog transports for server and browser, with trace injection support.
- Context propagation utilities (AsyncLocalStorage on Node, stack emulation on web).
- Composable transport factories (console, pretty terminal, Consola, Datadog).
- Runtime metadata collectors for service ownership, release, and environment data.
- Developer-friendly debugging helpers (pretty printing, structured console output).
- Structured error serialization with round-trippable custom error constructors.

## Install

```bash
pnpm add @cues/sawdust
```

The Datadog browser SDKs (`@datadog/browser-logs`, `@datadog/browser-rum`) are optional peer
dependencies — install them only if you enable the browser Datadog transports or RUM.

## Usage

```javascript
import { logger, configureLogger } from '@cues/sawdust/logger'

configureLogger({
  prefix: '[Server]',
  transports: {
    console: { enabled: true },
    datadog: {
      enabled: true,
      options: { service: 'my-service', source: 'node' },
    },
  },
})

logger.info('Sawdust is ready', { env: process.env.NODE_ENV })
```

```typescript
import {
  logger,
  configureLogger,
  adoptExternalLogger,
  type LoggerOptions,
} from '@cues/sawdust/logger'

const options: LoggerOptions = {
  prefix: '[UI]',
  transports: {
    console: { enabled: true },
    pretty: { enabled: import.meta.env.MODE === 'development' },
    datadogBrowser: {
      enabled: true,
      options: { forwardErrorsToLogs: true },
    },
  },
}

const browserLogger = configureLogger(options, { stage: 'final', id: 'web:final' })

// Later, adopt an externally created logger (e.g. one provided by the framework runtime)
adoptExternalLogger(browserLogger.child({ viewport: 'desktop' }), { id: 'web:extern' })

browserLogger.info('Hydration complete')
```

## Entry points

The package exposes runtime-conditional exports. Import a bare module name and the correct
browser/node variant is resolved automatically:

- `@cues/sawdust` — public types and shared helpers (`formatError`, `rum`, logger utilities).
- `@cues/sawdust/logger` — the logger façade and `configureLogger` / `adoptExternalLogger`.
- `@cues/sawdust/types` and `@cues/sawdust/types/*` — public type definitions.
- `@cues/sawdust/serializeError` — structured error serialization helpers.

## Configuration

- **Environment variables**
  - `NODE_ENV` — toggles pretty transport defaults.
  - `DD_API_KEY`, `DD_CLIENT_TOKEN` — enable Datadog server/browser transports.
  - `DD_TRACE_ENABLED` — controls Datadog trace injection in Node.
- **Logger hints (`configureLogger` / `adoptExternalLogger`)**
  - `stage`: `'preinit' | 'partial' | 'final'` (affects scoring).
  - `id`: human-friendly identifier recorded in logger metadata.
  - `force`: override scoring rules for explicit replacements.
- **Transports**
  - `transports.console.enabled` — force-enable native console logging.
  - `transports.pretty.viewMode` — `'inline' | 'expanded'` output style.
  - `transports.datadog.options` — Datadog transport configuration (API host, tags).
  - `datadogTraceInjection.enabled` — enable dd-trace correlation (Node only).

## Development

```bash
pnpm install      # install dependencies
pnpm typecheck    # type-check without emitting
pnpm build        # emit ESM bundles + declarations to dist/
pnpm lint         # run Biome
pnpm test         # run the Vitest suite
```

Build artifacts populate `dist/` with ESM output and type declarations. Submit changes with a
green `typecheck`, `lint`, and `test`.
