import type { Runtime } from '@loglayer/transport-simple-pretty-terminal'
import { SimplePrettyTerminalTransport } from '@loglayer/transport-simple-pretty-terminal'
import type {
  LogLevelType,
  PrettyTerminalTransportOptions,
} from './types/index.js'

/**
 * Factory for the developer-friendly pretty terminal/browser transport.
 *
 * @param prettyOptions Caller configuration:
 * - `id`: Optional transport identifier (`'prettyTerminal'` by default).
 * - `runtime`: Overrides the inferred runtime (`'browser' | 'node'`); falls back to the provided `runtime` argument.
 * - `enabled`: Enables/disables the transport (defaults to `true`).
 * - `viewMode`: Presentation mode (`'inline'` by default) controlling how payloads render.
 * - `includeDataInBrowserConsole`: When `true`, mirrors structured data into `console` for browser debugging.
 * - `showLogId`, `maxInlineDepth`, `theme`, `timestampFormat`, `collapseArrays`, `flattenNestedObjects`: Optional knobs for shaping the output; match the upstream transport API.
 * @param logLevel Minimum level the transport emits.
 * @param runtime Runtime hint used when `prettyOptions.runtime` is absent.
 *
 * @returns A configured `SimplePrettyTerminalTransport`.
 *
 * @example
 * ```ts
 * const pretty = createPrettyTransport(
 *   { viewMode: 'expanded', theme: 'dark' },
 *   { logLevel: 'debug', runtime: 'browser' },
 * )
 * ```
 */
export const createPrettyTransport = (
  prettyOptions: PrettyTerminalTransportOptions,
  {
    logLevel,
    runtime,
  }: {
    logLevel: LogLevelType
    runtime: Runtime
  },
): SimplePrettyTerminalTransport | undefined => {
  return new SimplePrettyTerminalTransport({
    id: prettyOptions?.id ?? 'prettyTerminal',
    runtime: prettyOptions?.runtime ?? runtime, // browser or node
    enabled: prettyOptions?.enabled ?? true,
    level: logLevel,
    viewMode: prettyOptions?.viewMode ?? 'inline',
    includeDataInBrowserConsole:
      prettyOptions?.includeDataInBrowserConsole ?? false,
    showLogId: prettyOptions?.showLogId ?? false,
    maxInlineDepth: prettyOptions?.maxInlineDepth,
    theme: prettyOptions?.theme,
    timestampFormat: prettyOptions?.timestampFormat,
    collapseArrays: prettyOptions?.collapseArrays,
    flattenNestedObjects: prettyOptions?.flattenNestedObjects,
  })
}
