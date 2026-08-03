# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets). It drives
per-package semver bumps and `CHANGELOG.md` generation.

- Run `pnpm changeset` to record a change (pick affected packages + bump level + summary).
- CI consumes pending changesets to open a "Version Packages" PR; merging it publishes to npm.

See the [Providers guide](https://catesandrew.github.io/sawdust/docs/concepts/providers) for the
package layout and the repo README for the release workflow.
