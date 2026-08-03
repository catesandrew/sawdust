# @cues/sawdust

## 0.1.1

### Patch Changes

- d840d67: Add a `types` condition to the `./*` subpath export so TypeScript (NodeNext) resolves types for
  subpath imports like `@cues/sawdust/logger`. Previously only the runtime JS resolved; consumers
  that import the logger subpath for types (e.g. `@cues/sawdust-react`) now type-check without a
  workaround.
