import type { ReactNode } from 'react'
import clsx from 'clsx'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import CodeBlock from '@theme/CodeBlock'
import Heading from '@theme/Heading'

import styles from './index.module.css'

const CODE_SAMPLE = `import { logger } from '@cues/sawdust/logger'

// Works the same in Node, the browser, and workers.
logger.info('checkout completed', { orderId, amountCents })
logger.error('payment failed', err, { orderId })`

type Feature = {
  icon: string
  title: string
  body: ReactNode
}

const FEATURES: Feature[] = [
  {
    icon: '🌍',
    title: 'One API, every runtime',
    body: 'The same import and the same calls run in Node.js, the browser, and background workers. No per-environment logger, no #ifdefs, no drift.',
  },
  {
    icon: '🔌',
    title: 'Pluggable transports',
    body: 'Console, pretty terminal, Consola, Datadog logs, Datadog browser logs, and RUM — mix and match per environment. Built on LogLayer.',
  },
  {
    icon: '♻️',
    title: 'Configure once, upgrade in place',
    body: 'A singleton façade you can import before it is even configured. Bootstrap promotes it to a richer logger without breaking a single existing import.',
  },
  {
    icon: '🧵',
    title: 'Request-scoped context',
    body: 'AsyncLocalStorage on Node stamps every log inside a request with its requestId, userId, and route — automatically, with zero prop drilling.',
  },
  {
    icon: '🧪',
    title: 'Testing built in',
    body: 'Service-locator resets and a noop logger make suites deterministic. Swap in a mock, assert the calls, reset — no leaking global state.',
  },
  {
    icon: '🛡️',
    title: 'Structured & safe',
    body: 'Round-trippable error serialization and context sanitization mean clean, queryable logs instead of stringified stack-trace soup.',
  },
]

function Hero() {
  const { siteConfig } = useDocusaurusContext()
  return (
    <header className={styles.heroBanner}>
      <div className="container">
        <span className={styles.pill}>Runtime-agnostic logging · built on LogLayer</span>
        <Heading as="h1" className={styles.heroTitle}>
          Stop rewriting your <span className={styles.heroGrad}>logger</span> for every runtime.
        </Heading>
        <p className={styles.heroTagline}>{siteConfig.tagline}</p>
        <div className={styles.heroButtons}>
          <Link className="button button--primary button--lg" to="/docs/getting-started">
            Get Started in 5 Minutes →
          </Link>
          <Link className="button button--secondary button--lg" to="/docs/why-sawdust">
            Why Sawdust?
          </Link>
        </div>
      </div>
    </header>
  )
}

function CodeShowcase() {
  return (
    <section className={styles.sectionPad}>
      <div className="container">
        <div className="row" style={{ alignItems: 'center' }}>
          <div className="col col--5">
            <Heading as="h2" className={styles.sectionTitle} style={{ textAlign: 'left' }}>
              This is the whole learning curve.
            </Heading>
            <p style={{ opacity: 0.8, fontSize: '1.1rem' }}>
              Import the singleton and log. No factory to wire up, no context provider to
              mount, no environment checks. When you are ready for Datadog, pretty output, or
              request tracing, you opt in — the call sites never change.
            </p>
            <Link className="button button--primary button--lg" to="/docs/intro">
              Read the intro
            </Link>
          </div>
          <div className="col col--7">
            <CodeBlock language="typescript">{CODE_SAMPLE}</CodeBlock>
          </div>
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section className={clsx(styles.sectionPad)} style={{ background: 'var(--ifm-background-surface-color)' }}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Everything a shared logging layer should be
        </Heading>
        <p className={styles.sectionSub}>
          Sawdust is the logging toolkit your monorepo keeps trying to build by hand — done
          once, correctly, and shared everywhere.
        </p>
        <div className="row">
          {FEATURES.map((f) => (
            <div key={f.title} className="col col--4" style={{ marginBottom: '1.5rem' }}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <Heading as="h3">{f.title}</Heading>
                <p style={{ marginBottom: 0, opacity: 0.85 }}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Matrix() {
  return (
    <section className={styles.sectionPad}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Runtime coverage
        </Heading>
        <p className={styles.sectionSub}>One package. The right build resolves automatically.</p>
        <div className="row">
          <div className="col col--8 col--offset-2">
            <table className={styles.matrix}>
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>Node.js</th>
                  <th>Browser</th>
                  <th>Worker</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Singleton façade + scoring</td><td>✅</td><td>✅</td><td>✅</td></tr>
                <tr><td>Console / pretty / Consola</td><td>✅</td><td>✅</td><td>✅</td></tr>
                <tr><td>Datadog server logs + APM trace injection</td><td>✅</td><td>—</td><td>✅</td></tr>
                <tr><td>Datadog browser logs + RUM</td><td>—</td><td>✅</td><td>—</td></tr>
                <tr><td>AsyncLocalStorage request scope</td><td>✅</td><td>stack emulation</td><td>✅</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className={clsx(styles.sectionPad)} style={{ textAlign: 'center', background: 'var(--ifm-background-surface-color)' }}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Your future self is already using it.
        </Heading>
        <p className={styles.sectionSub}>
          Add one dependency, delete a folder of bespoke logger glue, and get consistent
          structured logs across every app you ship.
        </p>
        <div className={styles.heroButtons}>
          <Link className="button button--primary button--lg" to="/docs/getting-started">
            Install Sawdust
          </Link>
          <Link className="button button--secondary button--lg" to="/docs/patterns/catalog">
            Browse the Pattern Catalog
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext()
  return (
    <Layout
      title={`${siteConfig.title} — runtime-agnostic logging`}
      description="One logging API for the browser, Node.js, and workers. Configure once, log everywhere.">
      <Hero />
      <main>
        <CodeShowcase />
        <Features />
        <Matrix />
        <FinalCta />
      </main>
    </Layout>
  )
}
