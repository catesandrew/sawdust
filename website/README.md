# Sawdust docs site

[Docusaurus](https://docusaurus.io/) site for `@cues/sawdust`. Deploys to GitHub Pages at
<https://catesandrew.github.io/sawdust/> via `.github/workflows/deploy-docs.yml`.

## Local development

```bash
cd website
npm install
npm start        # dev server with hot reload at http://localhost:3000/sawdust/
```

## Build

```bash
npm run build    # static output to website/build
npm run serve    # preview the production build locally
```

## Structure

- `docs/` — the documentation content (intro, getting started, guides, concepts, reference,
  patterns).
- `src/pages/index.tsx` — the marketing landing page.
- `docusaurus.config.ts` — site config (nav, footer, Mermaid, Pages base URL).
- `sidebars.ts` — sidebar layout.

Mermaid diagrams are enabled — use ` ```mermaid ` fenced code blocks.
