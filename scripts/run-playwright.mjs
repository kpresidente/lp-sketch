#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const playwrightCli = require.resolve('@playwright/test/cli')
const args = process.argv.slice(2)
const env = { ...process.env }

if (process.platform === 'linux') {
  const libDir = env.PLAYWRIGHT_LOCAL_LIB_DIR
    ?? path.join(homedir(), '.local', 'playwright-libs', 'usr', 'lib', 'x86_64-linux-gnu')

  if (existsSync(libDir)) {
    env.LD_LIBRARY_PATH = env.LD_LIBRARY_PATH
      ? `${libDir}:${env.LD_LIBRARY_PATH}`
      : libDir
  }
}

const child = spawn(process.execPath, [playwrightCli, ...args], {
  env,
  stdio: 'inherit',
})

child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
