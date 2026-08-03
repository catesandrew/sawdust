import type * as Preset from '@docusaurus/preset-classic'
import type { Config } from '@docusaurus/types'
import { themes as prismThemes } from 'prism-react-renderer'

const config: Config = {
  title: 'Sawdust',
  tagline:
    'One logging API for the browser, Node.js, and workers. Configure once, log everywhere.',
  favicon: 'img/favicon.svg',

  url: 'https://catesandrew.github.io',
  baseUrl: '/sawdust/',

  organizationName: 'catesandrew',
  projectName: 'sawdust',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/catesandrew/sawdust/tree/main/website/',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.svg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Sawdust',
      logo: {
        alt: 'Sawdust logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/getting-started',
          label: 'Getting Started',
          position: 'left',
        },
        {
          to: '/docs/patterns/catalog',
          label: 'Pattern Catalog',
          position: 'left',
        },
        {
          href: 'https://github.com/catesandrew/sawdust',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/docs/intro' },
            { label: 'Getting Started', to: '/docs/getting-started' },
            { label: 'Architecture', to: '/docs/concepts/architecture' },
          ],
        },
        {
          title: 'Guides',
          items: [
            { label: 'Node.js', to: '/docs/guides/node' },
            { label: 'Browser', to: '/docs/guides/browser' },
            { label: 'Request Scope', to: '/docs/guides/request-scope' },
            { label: 'Testing', to: '/docs/guides/testing' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'Pattern Catalog', to: '/docs/patterns/catalog' },
            { label: 'GitHub', href: 'https://github.com/catesandrew/sawdust' },
            { label: 'LogLayer', href: 'https://loglayer.dev' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Sawdust. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'tsx'],
    },
    mermaid: {
      theme: { light: 'neutral', dark: 'dark' },
    },
  } satisfies Preset.ThemeConfig,
}

export default config
