# @cues/sawdust-angular

Angular integration for [`@cues/sawdust`](https://www.npmjs.com/package/@cues/sawdust) — an
SSR-safe `provideSawdustLogger`, an `injectLogger` function, and a dependency-injection helper.
Uses Angular's **functional providers** (no decorators), so it drops into standalone apps and is
fully tree-shakable.

📖 **Docs:** <https://catesandrew.github.io/sawdust/docs/guides/angular>

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

`provideSawdustLogger` is **SSR-safe**: on the server it configures the façade with transports and
plugins stripped (usable but silent); on the browser it configures the full options — so Angular
Universal never double-logs. `options` is a `LoggerOptions` from `@cues/sawdust`, so provider
transports (`@cues/sawdust-datadog`, `@cues/sawdust-otel`) go in `extraTransports` / `plugins`.

## Inject a logger

```ts
import { Component } from '@angular/core'
import { injectLogger } from '@cues/sawdust-angular'

@Component({ selector: 'app-batch-table', standalone: true, template: '' })
export class BatchTableComponent {
  private readonly log = injectLogger('BatchTable', { store: 'batches' })

  ngOnInit() {
    this.log.info('initialized')
  }
}
```

`injectLogger()` (no args) returns the canonical logger; with a name it returns a child bound to
`{ component, ...context }`. Call it in an injection context (constructor or field initializer).
You can also `inject(SAWDUST_LOGGER)` directly.

## Dependency injection — `withChildLogger`

```ts
import { withChildLogger } from '@cues/sawdust-angular'

const storeLogger = withChildLogger(maybeInjected, rootLogger, { store: 'ViewStore' })
```

## Conventions

- **Types** come from `@cues/sawdust`; this package does not re-export them.
- RUM bindings are planned for a later release; v1 ships the logger core + DI conventions.

## License

MIT
