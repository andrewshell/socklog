/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Socklog',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => {
        if (format === 'es') return 'socklog.js'
        if (format === 'cjs') return 'socklog.cjs'
        return `socklog.${format}.js`
      }
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        inlineDynamicImports: true
      }
    },
    sourcemap: true
  },
  server: {
    open: '/demo/index.html'
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.{test,spec}.ts', 'src/test/**', 'src/index.ts']
    }
  }
})
