import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'getting-started',
    'why-sawdust',
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        'guides/node',
        'guides/browser',
        'guides/request-scope',
        'guides/rum',
        'guides/react',
        'guides/angular',
        'guides/testing',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      collapsed: false,
      items: [
        'concepts/architecture',
        'concepts/providers',
        'concepts/sequence-flows',
        'concepts/singleton-scoring',
        'concepts/service-locator',
      ],
    },
    {
      type: 'category',
      label: 'Providers',
      collapsed: false,
      items: ['providers/datadog', 'providers/otel'],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/entry-points',
        'reference/configuration',
        'reference/transports',
      ],
    },
    {
      type: 'category',
      label: 'Patterns',
      items: ['patterns/catalog'],
    },
  ],
}

export default sidebars
