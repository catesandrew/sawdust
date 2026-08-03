# Node Logger Demo Snippets

The following snippets illustrate how to exercise the singleton-based façade inside a client application (Next.js, Remix, vanilla SPA, etc.).

## 1. Configure Once, Anywhere

```typescript
import {
  logger,
  configureLogger,
  adoptExternalLogger,
  getCurrentLoggerMeta,
  readLoggerMeta,
  LoggerImpl,
} from '@cues/sawdust/logger'
import type { LoggerOptions } from '@cues/sawdust'

function printDivider(): void {
  console.log('\n' + '-'.repeat(72) + '\n')
}

function printMeta(label: string): void {
  const meta = getCurrentLoggerMeta()
  if (!meta) {
    console.log(`${label}: <no canonical logger installed>`)
    return
  }

  const summary = {
    id: meta.id ?? null,
    stage: meta.stage,
    transports: meta.features.transports.join(', ') || '(none)',
    ddTrace: meta.features.ddTrace ?? false,
    source: meta.source,
    createdAt: new Date(meta.createdAt).toISOString(),
    priority: meta.priority ?? null,
  }

  console.log(`${label}:`, summary)
}

function logScenario(step: string, message: string): void {
  printDivider()
  console.log(`${step} ${message}`)
}

function buildPartialOptions(): LoggerOptions {
  return {
    prefix: '[Partial]',
    transports: {
      console: { enabled: true, messageField: 'msg' },
      pretty: {
        enabled: true,
        runtime: 'node',
        viewMode: 'inline',
      },
    },
  }
}

function buildFinalOptions(): LoggerOptions {
  return {
    prefix: '[Final]',
    transports: {
      console: {
        enabled: true,
        messageField: 'message',
        appendObjectData: true,
      },
      pretty: {
        enabled: true,
        runtime: 'node',
        viewMode: 'expanded',
      },
      consola: {
        enabled: true,
        createOptions: { level: 5 },
      },
    },
  }
}

async function main(): Promise<void> {
  logScenario('①', 'Bootstrap: pre-init logger is available immediately')
  logger.info('Logging during bootstrap before configuration', {
    stage: 'preinit',
  })
  printMeta('Current meta')

  logScenario('②', 'Install a partial logger configuration')
  const partialOptions = buildPartialOptions()
  configureLogger(partialOptions, { id: 'node:partial', stage: 'partial' })
  logger.debug('Partial logger installed', { transports: 'console+pretty' })
  printMeta('After partial install')

  logScenario(
    '③',
    'Attempt to downgrade with a weaker preinit candidate (should be ignored)',
  )
  configureLogger(
    {
      prefix: '[Weaker]',
      transports: {
        console: { enabled: true },
      },
    },
    { id: 'node:downgrade', stage: 'partial' },
  )
  logger.info('Downgrade was rejected; still using stronger logger')
  printMeta('After downgrade attempt')

  logScenario('④', 'Upgrade to a final logger with richer transports')
  const finalOptions = buildFinalOptions()
  configureLogger(finalOptions, { id: 'node:final', stage: 'final' })
  logger.error('Final logger online', new Error('demo error'), {
    requestId: 'req-123',
  })
  printMeta('After final install')

  logScenario(
    '⑤',
    'Adopt an externally created logger (force override to simulate takeover)',
  )
  const external = new LoggerImpl({
    prefix: '[Adopted]',
    transports: {
      console: { enabled: true, messageField: 'msg' },
    },
  })
  adoptExternalLogger(external, {
    id: 'node:adopted',
    stage: 'final',
    force: true,
  })
  logger.warn('External logger adopted successfully')
  printMeta('After adoption')
  console.log('External logger branded meta:', readLoggerMeta(external))

  printDivider()
  console.log('Demo complete ✓')
}

main().catch((error) => {
  console.error('Demo failed', error)
  process.exitCode = 1
})
```
