import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import helpPlugin from './src/help/vite-plugin-help'

export default defineConfig({
  plugins: [helpPlugin(), solid()],
})
