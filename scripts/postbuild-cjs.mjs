// Marks dist/cjs as CommonJS so Node treats its .js files as CJS even though the
// package root is "type": "module". Runs after the CJS tsc pass.
import { writeFileSync } from 'node:fs'

writeFileSync(
  new URL('../dist/cjs/package.json', import.meta.url),
  '{\n  "type": "commonjs"\n}\n',
)
