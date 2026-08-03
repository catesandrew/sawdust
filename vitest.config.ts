import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    alias: {
      // Resolvable target for the `vi.doMock('virtual-error-module', ...)` case
      // in serializeError.test.ts (the factory replaces the stub's exports).
      'virtual-error-module': fileURLToPath(
        new URL('./test/stubs/virtual-error-module.ts', import.meta.url),
      ),
    },
  },
})
