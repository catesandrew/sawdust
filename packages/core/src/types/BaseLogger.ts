import type { MessageDataType } from '@loglayer/shared'
import type { LogContext } from './LogContext.js'

/**
 * Lightweight logging contract supporting multiple overloads:
 * - plain message(s)
 * - messages + context
 * - messages + error
 * - messages + error + context
 *
 * Concrete logger implementations (browser, server) extend this to add rich behavior.
 */
export interface BaseLogger {
  /** Log one or more messages at trace level. */
  trace(...messages: MessageDataType[]): void
  /** Log one or more messages at debug level. */
  debug(...messages: MessageDataType[]): void
  /** Log one or more messages at info level. */
  info(...messages: MessageDataType[]): void
  /** Log one or more messages at warn level. */
  warn(...messages: MessageDataType[]): void
  /** Log one or more messages at error level. */
  error(...messages: MessageDataType[]): void
  /** Log one or more messages at fatal level. */
  fatal(...messages: MessageDataType[]): void

  /** Log message(s) with additional structured context. */
  trace(...messagesAndContext: [...MessageDataType[], LogContext]): void
  debug(...messagesAndContext: [...MessageDataType[], LogContext]): void
  info(...messagesAndContext: [...MessageDataType[], LogContext]): void
  warn(...messagesAndContext: [...MessageDataType[], LogContext]): void
  error(...messagesAndContext: [...MessageDataType[], LogContext]): void
  fatal(...messagesAndContext: [...MessageDataType[], LogContext]): void

  /** Log message(s) with an accompanying Error. */
  trace(...messagesAndError: [...MessageDataType[], Error]): void
  debug(...messagesAndError: [...MessageDataType[], Error]): void
  info(...messagesAndError: [...MessageDataType[], Error]): void
  warn(...messagesAndError: [...MessageDataType[], Error]): void
  error(...messagesAndError: [...MessageDataType[], Error]): void
  fatal(...messagesAndError: [...MessageDataType[], Error]): void

  /** Log message(s) with both Error and structured context. */
  trace(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  debug(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  info(...messagesErrorContext: [...MessageDataType[], Error, LogContext]): void
  warn(...messagesErrorContext: [...MessageDataType[], Error, LogContext]): void
  error(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void
  fatal(
    ...messagesErrorContext: [...MessageDataType[], Error, LogContext]
  ): void

  /**
   * Optional helper that returns a logger decorated with additional context.
   * Implementations that don't support child loggers can omit this method.
   */
  child?(context?: LogContext): BaseLogger
}
