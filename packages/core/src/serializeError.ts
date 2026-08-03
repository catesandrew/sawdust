/**
 * Central serialize-error wrapper that also registers a curated set of
 * "known" error constructors so they round-trip cleanly.
 *
 * Usage:
 *   import { serializeError } from '@cues/sawdust/serializeError'
 *   // (optional) import { extendKnownErrors, registerKnownErrorsFromModules } from '@cues/sawdust/serializeError'
 */
import { addKnownErrorConstructor, serializeError } from 'serialize-error'

type ErrorCtor = new (...args: any[]) => any

/** Try to register a constructor; ignore ones that don't support zero-arg construction. */
function tryRegister(ctor: unknown) {
  if (typeof ctor !== 'function') {
    return
  }
  try {
    // serialize-error requires the constructor to work with no args.
    addKnownErrorConstructor(ctor as ErrorCtor)
  } catch {
    // If the ctor requires args, addKnownErrorConstructor will throw—ignore.
  }
}

/** Scan an export object and register anything that looks like an error-ish constructor. */
function registerAllErrorishConstructorsFrom(mod: Record<string, unknown>) {
  for (const key of Object.keys(mod)) {
    const val = (mod as any)[key]
    if (
      typeof val === 'function' &&
      /(?:Error|Exception|Failure)$/.test(val.name || key)
    ) {
      tryRegister(val)
    }
  }
}

/**
 * Dynamic import that won't crash build tools if the module isn't installed.
 * We keep the specifier dynamic so bundlers don't try to resolve it statically.
 */
function importIfAvailable(
  specifier: string,
): Promise<Record<string, unknown>> {
  // Hints help some bundlers avoid pre-bundling a missing dep.
  return import(/* @vite-ignore */ /* webpackIgnore: true */ specifier)
}

// These exist in most modern runtimes and are safe to register immediately.
try {
  if (typeof AggregateError !== 'undefined')
    tryRegister(AggregateError as unknown as ErrorCtor)
} catch {}
try {
  if (typeof (globalThis as any).DOMException !== 'undefined')
    tryRegister((globalThis as any).DOMException)
} catch {}

// // Zod (schema validation)
// void importIfAvailable('zod')
//   .then((mod) => {
//     // ZodError is the one we care about
//     tryRegister((mod as any).ZodError)
//   })
//   .catch(() => {})

// // Temporal (Temporal.io TypeScript SDK failures)
// void importIfAvailable('@temporalio/common')
//   .then((mod) => {
//     const m = mod as any
//     ;[
//       m.ApplicationFailure,
//       m.ActivityFailure,
//       m.CancelledFailure, // TS SDK uses British spelling "Cancelled"
//       m.ChildWorkflowFailure,
//       m.ServerFailure,
//       m.TerminatedFailure,
//       m.TimeoutFailure,
//       // also useful service-level errors:
//       m.WorkflowExecutionAlreadyStartedError,
//       m.WorkflowNotFoundError,
//       m.NamespaceNotFoundError,
//     ].forEach(tryRegister)
//   })
//   .catch(() => {})

// // Auth.js (NextAuth v5) errors
// void importIfAvailable('@auth/core/errors')
//   .then((mod) => registerAllErrorishConstructorsFrom(mod))
//   .catch(() => {})

// // Redis client error classes (node-redis + redis-parser ecosystem)
// void importIfAvailable('redis-errors')
//   .then((mod) => registerAllErrorishConstructorsFrom(mod))
//   .catch(() => {})
// void importIfAvailable('redis-parser')
//   .then((mod) => registerAllErrorishConstructorsFrom(mod))
//   .catch(() => {})

// // AWS SDK v3 / Smithy base service exceptions
// void importIfAvailable('@smithy/smithy-client')
//   .then((mod) => {
//     // ServiceException base; some services also export <Service>ServiceException subclasses
//     tryRegister((mod as any).ServiceException)
//     registerAllErrorishConstructorsFrom(mod as any)
//   })
//   .catch(() => {})

// // xior (lightweight axios-like) – scan for any exported error-ish constructors if they exist
// void importIfAvailable('xior')
//   .then((mod) => registerAllErrorishConstructorsFrom(mod))
//   .catch(() => {})

// NOTE: Many libs either don't expose public error classes or just throw plain
// Error's. The scan above means if they ever DO export constructors named
// *Error/*Exception/*Failure, they'll be picked up automatically without a code
// change.

/**
 * Manually extend the list with your own constructors, if you have
 * custom domain errors or internal classes.
 */
export function extendKnownErrors(...constructors: ErrorCtor[]) {
  for (const Ctor of constructors) tryRegister(Ctor)
}

/**
 * If you want to force-load & register from specific modules at app bootstrap:
 *
 *   await registerKnownErrorsFromModules('axios', '@sentry/core');
 *
 * This scans every export of those modules for *Error/*Exception/*Failure constructors.
 */
export async function registerKnownErrorsFromModules(
  ...moduleSpecifiers: string[]
) {
  for (const specifier of moduleSpecifiers) {
    try {
      const mod = await importIfAvailable(specifier)
      registerAllErrorishConstructorsFrom(mod)
    } catch {
      // ignore missing or failed modules
    }
  }
}

// Re-export the thing callers will actually use.
export { addKnownErrorConstructor, serializeError }

// USAGE

// Instead of: import { serializeError } from "serialize-error";
// import { serializeError } from "@cues/sawdust/serializeError";

// // Optional: at app bootstrap you can harden coverage if you know certain deps are present:
// import { registerKnownErrorsFromModules, extendKnownErrors } from "@cues/sawdust/serializeError";

// await registerKnownErrorsFromModules('axios') // e.g., will pick up AxiosError if exported
// class MyCustomError extends Error {}
// extendKnownErrors(MyCustomError);
