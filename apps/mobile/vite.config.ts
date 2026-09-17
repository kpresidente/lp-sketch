import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import helpPlugin from '@lp-sketch/editor/help/vite-plugin'

export default defineConfig({
  root: import.meta.dirname,
  // Mobile has its own environment; do not inherit browser service endpoints.
  envDir: import.meta.dirname,
  plugins: [helpPlugin(), solid()],
  resolve: {
    dedupe: ['solid-js'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
