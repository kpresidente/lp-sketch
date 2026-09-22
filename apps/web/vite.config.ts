import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { resolve } from 'node:path'
import helpPlugin from '@lp-sketch/editor/help/vite-plugin'

const repositoryRoot = resolve(import.meta.dirname, '../..')

export default defineConfig({
  root: import.meta.dirname,
  envDir: repositoryRoot,
  plugins: [helpPlugin(), solid()],
  resolve: {
    dedupe: ['solid-js'],
  },
  build: {
    outDir: resolve(repositoryRoot, 'dist'),
    emptyOutDir: true,
  },
})
