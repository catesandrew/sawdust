---
sidebar_position: 2
title: Sequence Flows
description: Step-by-step sequence diagrams for bootstrap, upgrade, request scope, and RUM.
---

# Sequence flows

These diagrams trace the runtime interactions behind the everyday APIs.

## Bootstrap & in-place upgrade

The façade is usable before configuration and upgrades without breaking existing imports.

```mermaid
sequenceDiagram
  autonumber
  participant App as App code
  participant Facade as logger façade
  participant Sing as singleton (scored)
  participant Loc as logger locator
  participant LX as LogLayer

  App->>Facade: logger.info('preinit')
  Facade->>Sing: resolve current
  Sing-->>Facade: noop/console fallback
  Facade-->>App: logged

  Note over App: bootstrap runs
  App->>Sing: configureLogger(opts, {stage:'final'})
  Sing->>Sing: score candidate vs current
  Sing->>Loc: setLogger(newCanonical)
  Sing->>LX: build transports + plugins
  Sing-->>App: canonical logger

  App->>Facade: logger.info('after config')
  Facade->>Loc: getLogger()
  Loc-->>Facade: canonical logger
  Facade->>LX: emit
```

## Downgrade protection

A weaker candidate cannot replace a stronger canonical logger unless `force: true`.

```mermaid
sequenceDiagram
  autonumber
  participant App
  participant Sing as singleton
  App->>Sing: configureLogger(final, {stage:'final'})
  Sing-->>App: installed (score = high)
  App->>Sing: configureLogger(weak, {stage:'partial'})
  Sing->>Sing: score(weak) < score(current)?
  alt weaker
    Sing-->>App: ignored (keep current)
  else forced
    App->>Sing: configureLogger(weak, {force:true})
    Sing-->>App: replaced
  end
```

## Request-scoped logging

`withRequestContext` binds metadata for the lifetime of the callback.

```mermaid
sequenceDiagram
  autonumber
  participant H as Route handler
  participant RS as request scope (ALS)
  participant RL as getRequestLogger()
  participant LX as LogLayer

  H->>RS: withRequestContext({requestId,userId}, fn)
  activate RS
  RS->>RS: merge bindings into store
  RS->>H: run fn()
  H->>RL: getRequestLogger()
  RL->>RS: read current store
  RS-->>RL: {requestId,userId}
  RL->>LX: emit log WITH bindings
  H-->>RS: fn resolves
  RS->>RS: store reverts
  deactivate RS
```

## RUM locator

```mermaid
sequenceDiagram
  autonumber
  participant Boot as hydration bootstrap
  participant RL as rum locator
  participant RC as Datadog RUM client
  participant Lib as shared library

  Boot->>RL: getRumClient(options)
  RL->>RC: init(options)
  RL-->>Boot: client (stored in locator)
  Lib->>RL: getRumClient()
  RL-->>Lib: same client
  Lib->>RC: addAction('feature-used', {...})
```

See [Singleton & Scoring](./singleton-scoring.md) for how a candidate's score is computed.
