/**
 * Vite plugin that runs the help build script (src/help/build-help.mjs)
 * to convert src/help/USER_MANUAL.md → public/help.html + public/help-glossary.json.
 *
 * - In production builds: runs once at build start.
 * - In dev mode: runs once at server start, then watches USER_MANUAL.md
 *   and re-runs on changes.
 */

import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

function isVitestRuntime(): boolean {
  return process.env.VITEST === 'true' ||
    process.env.VITEST === '1' ||
    typeof process.env.VITEST_WORKER_ID === 'string' ||
    typeof process.env.VITEST_POOL_ID === 'string' ||
    process.env.NODE_ENV === 'test'
}

function runHelpBuild(): void {
  execSync('node src/help/build-help.mjs', {
    cwd: resolve(import.meta.dirname!, '../..'),
    stdio: 'inherit',
  })
}

export default function helpPlugin(): Plugin {
  if (isVitestRuntime()) {
    return { name: 'lp-sketch-help' }
  }

  return {
    name: 'lp-sketch-help',

    // Run on both dev server start and production build start
    buildStart() {
      runHelpBuild()
    },

    configureServer(server) {
      const manualPath = resolve(import.meta.dirname!, 'USER_MANUAL.md')
      server.watcher.add(manualPath)
      server.watcher.on('change', (file) => {
        if (file === manualPath) {
          console.log('\nhelp: USER_MANUAL.md changed, rebuilding help...')
          try {
            runHelpBuild()
          } catch {
            // Build script already logs its own errors
          }
        }
      })
    },
  }
}
