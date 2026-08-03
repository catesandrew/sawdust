import type {
  LogLayerPlugin,
  PluginBeforeMessageOutParams,
} from '@loglayer/plugin'

/**
 * Creates a LogLayer plugin that prepends a runtime tag to the first log message.
 *
 * @param tag Human-readable runtime or environment label (e.g. `"Client"` or `"Server"`).
 * @returns A `LogLayerPlugin` whose `id` is derived from the tag (lowercased) and
 * whose `onBeforeMessageOut` hook inserts the tag in square brackets before the first string message.
 *
 * Usage notes:
 * - Only string-first payloads are modified; non-string payloads are passed through untouched to avoid breaking structured logs.
 * - Empty message arrays are returned as-is.
 * - Consider configuring different tags per runtime to quickly spot log origin in aggregated streams.
 *
 * @example
 * ```ts
 * const runtimeTagPlugin = createRuntimeTagPlugin('Client')
 * logLayer.use(runtimeTagPlugin)
 * // Emits: "[Client] fetching data"
 * logger.info('fetching data')
 * ```
 */
export const createRuntimeTagPlugin = (tag: string): LogLayerPlugin => {
  return {
    id: `runtime-tag-${tag.toLowerCase()}`,
    onBeforeMessageOut: (params: PluginBeforeMessageOutParams) => {
      if (!params.messages || params.messages.length === 0) {
        return params.messages
      }

      const [first, ...rest] = params.messages
      if (typeof first !== 'string') {
        return params.messages
      }

      return [`[${tag}] ${first}`, ...rest]
    },
  }
}
