---
sidebar_position: 7
title: Angular
description: SSR-safe provideSawdustLogger, injectLogger, and DI helpers via @cues/sawdust-angular.
---

# Angular

[`@cues/sawdust-angular`](https://www.npmjs.com/package/@cues/sawdust-angular) integrates the core
logger using Angular's **functional providers** — no decorators, fully tree-shakable, standalone
friendly. It does not re-export sawdust types; import those from `@cues/sawdust`.

## Install

```bash
pnpm add @cues/sawdust @cues/sawdust-angular
```

`@angular/core` and `@cues/sawdust` are peer dependencies (Angular >= 16).

## Provide the logger

```ts
import { bootstrapApplication } from '@angular/platform-browser'
import { provideSawdustLogger } from '@cues/sawdust-angular'
import { AppComponent } from './app.component'

bootstrapApplication(AppComponent, {
  providers: [
    provideSawdustLogger({ transports: { console: { enabled: true } } }),
  ],
})
```

`provideSawdustLogger` is **SSR-safe**: under Angular Universal it detects the server platform
(`PLATFORM_ID`) and configures the façade with transports and plugins stripped (usable but
silent); on the browser it configures the full options — so the server render never double-logs.
`options` is a `LoggerOptions` from `@cues/sawdust`, so provider transports
(`@cues/sawdust-datadog`, `@cues/sawdust-otel`) go in `extraTransports` / `plugins`.

## Inject a logger

```ts
import { Component, OnInit } from '@angular/core'
import { injectLogger } from '@cues/sawdust-angular'

@Component({ selector: 'app-batch-table', standalone: true, template: '' })
export class BatchTableComponent implements OnInit {
  private readonly log = injectLogger('BatchTable', { store: 'batches' })

  ngOnInit() {
    this.log.info('initialized')
  }
}
```

- `injectLogger()` — the canonical logger.
- `injectLogger(name, ctx?)` — a child bound to `{ component: name, ...ctx }`.
- Call it in an injection context (constructor or field initializer). You can also
  `inject(SAWDUST_LOGGER)` directly.

## Dependency injection — `withChildLogger`

Standardizes the `logger ?? root.child({ ... })` fallback for services that accept an optional
logger:

```ts
import { withChildLogger } from '@cues/sawdust-angular'

const storeLogger = withChildLogger(maybeInjected, rootLogger, { store: 'ViewStore' })
```

## Conventions

- **Types** from `@cues/sawdust`; **runtime** (`logger`, `configureLogger`) from
  `@cues/sawdust/logger`; **Angular bindings** from `@cues/sawdust-angular`.
- Canonical error call is `error(message, error, ctx)` — message-first, matching
  `info` / `warn(message, ctx)`.
- RUM bindings are planned for a later release; v1 ships the logger core + DI conventions.
