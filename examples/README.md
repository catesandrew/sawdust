# Sawdust Examples

This directory collects runnable snippets and focused guides that illustrate the locator-driven logging pattern across runtimes, the new logger singleton, adoption workflow, and façade behaviour.

## Node walk-through

- `node-demo.md` — scripted tour of the singleton lifecycle: pre-init logging, partial/final upgrades, downgrade protection, and forced adoption with metadata introspection. Showcases:
  - Pre-init logging before any configuration.
  - Idempotent upgrades (`partial` → `final`) with scoring safeguards.
  - Downgrade protection when weaker candidates try to replace the canonical logger.
  - Forced adoption of an external logger instance with metadata introspection.

## Browser snippets

See [`web-demo.md`](./web-demo.md) for framework-neutral snippets that demonstrate how to:
- Configure the browser logger once React hydration completes.
- Adopt an externally provided logger (e.g., Next.js instrumentation) without clobbering metadata.
- Query the singleton for diagnostics inside client components or custom hooks.

These snippets are intended to be dropped into a client bundle (Next.js, Vite, etc.) and rely only on the public web entry point.

## Testing helpers

- `jest.md` — outlines locator resets (`resetLoggerLocator`, `resetRumClientLocator`), mocking patterns, and spying tips for Jest suites.

## Request-scoped logging

- `request-scope.md` — explains `withRequestContext` usage, AsyncLocalStorage behaviour, integration examples (Next.js / Express), and how to test scoped logs.

## Locator patterns

- `locator.md` — service locator primer covering bootstrap expectations and how shared libraries consume `getLogger` without extra wiring.
- `creator.md` — design notes for `createLocator`, including the move from ad-hoc singletons to symbol-backed globals and before/after comparisons.

## RUM integration

- `rum.md` — demonstrates the RUM locator workflow, contrasts it with direct Datadog usage, and shows how shared modules can record actions.
