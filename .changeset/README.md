# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets). It drives
per-package semver bumps and `CHANGELOG.md` generation.

- Run `pnpm changeset` to record a change (pick affected packages + bump level + summary).
- CI consumes pending changesets to open a "Version Packages" PR; merging it publishes to npm.

See the [migration plan](../docs/monorepo-migration-plan.md) §7 for the release workflow.
