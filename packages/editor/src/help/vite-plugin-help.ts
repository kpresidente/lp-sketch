/**
 * Build the shared manual into the consuming application's public directory.
 *
 * - In production builds: runs once at build start.
 * - In dev mode: runs once at server start, then watches USER_MANUAL.md
 *   and re-runs on changes.
 */

import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

function isVitestRuntime(): boolean {
  return process.env.VITEST === 'true' ||
    process.env.VITEST === '1' ||
    typeof process.env.VITEST_WORKER_ID === 'string' ||
    typeof process.env.VITEST_POOL_ID === 'string' ||
    process.env.NODE_ENV === 'test'
}

function runHelpBuild(outputDirectory: string): void {
  execFileSync(process.execPath, [resolve(import.meta.dirname, 'build-help.mjs'), outputDirectory], {
    stdio: 'inherit',
  })
}

export default function helpPlugin(): Plugin {
  if (isVitestRuntime()) {
    return { name: 'lp-sketch-help' }
  }

  let outputDirectory: string

  return {
    name: 'lp-sketch-help',

    configResolved(config) {
      outputDirectory = config.publicDir
      if (!outputDirectory) {
        throw new Error('The help plugin requires an application public directory.')
      }
    },

    // Run on both dev server start and production build start
    buildStart() {
      runHelpBuild(outputDirectory)
    },

    configureServer(server) {
      const manualPath = resolve(import.meta.dirname!, 'USER_MANUAL.md')
      server.watcher.add(manualPath)
      server.watcher.on('change', (file) => {
        if (file === manualPath) {
          console.log('\nhelp: USER_MANUAL.md changed, rebuilding help...')
          try {
            runHelpBuild(outputDirectory)
          } catch {
            // Build script already logs its own errors
          }
        }
      })
    },
  }
}
