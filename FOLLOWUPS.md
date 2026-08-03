# Follow-ups

Ideas captured at extraction time (2026-08-02) — not yet started.

## Planned

- [x] **Docusaurus docs site.** Stood up in `website/` — landing page, getting
      started, guides (node/browser/request-scope/rum/testing), architecture +
      sequence-flow diagrams (Mermaid), reference (entry points, configuration,
      transports), and the full pattern catalog. Deploys to GitHub Pages via
      `.github/workflows/deploy-docs.yml`.
- [ ] **Multi-provider support, providers kept separate.** Today the transport
      layer is Datadog-centric (`@loglayer/transport-datadog`,
      `datadog-transport-common`, `dd-trace`, the RUM helpers). Generalize so
      other observability providers can plug in, with each provider isolated
      (its own module/subpath + optional peer deps) so consumers only pull the
      transport they use. Keep Datadog as one provider among several rather than
      the baked-in default.

## Housekeeping

- [ ] Reduce the `noExplicitAny` biome warnings (currently ~210, mostly in
      tests) carried over from the source — non-blocking, lint-clean today.
- [ ] `examples/jest.md` documents mocking `@cues/sawdust` in a jest consumer;
      add a vitest companion (this repo's own tooling) alongside it.
- [ ] Decide on npm publish (currently `publishConfig.access: restricted`,
      private repo).

## Provenance

Extracted from an internal monorepo's `sawdust` package and converted to
standalone conventions: single-package repo, `@cues/sawdust` scope, `tsc` ESM
build, vitest (jsdom), biome (single-quote / no-semicolon / trailing-comma),
NodeNext, strict TypeScript. The full transport/RUM surface and cross-runtime
(`.web`/`.node`) variants were kept intact.
