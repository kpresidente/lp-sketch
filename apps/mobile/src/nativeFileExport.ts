import type { FileExporter } from '@lp-sketch/editor'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const EXPORT_CACHE = 'lp-sketch-exports'
const CACHE_LIFETIME_MS = 24 * 60 * 60 * 1000
let exportInProgress = false

function safeFilename(filename: string): string {
  const sanitized = filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .trim()
  const extension = sanitized.match(/\.[a-z0-9]{1,10}$/i)?.[0] ?? ''
  const stem = (extension ? sanitized.slice(0, -extension.length) : sanitized)
    .trim().replace(/^\.+/, '')
  const encoder = new TextEncoder()
  const budget = 240 - encoder.encode(extension).length
  let result = ''
  let bytes = 0
  for (const character of stem) {
    const length = encoder.encode(character).length
    if (bytes + length > budget) break
    result += character
    bytes += length
  }
  return `${result || 'LP-Sketch'}${extension}`
}

async function blobBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

async function removeExportDirectory(path: string): Promise<void> {
  // Cleanup must not replace the original write/share error or completion result.
  await Filesystem.rmdir({ path, directory: Directory.Cache, recursive: true }).catch(() => undefined)
}

async function clearExpiredExports(): Promise<void> {
  // The namespace does not exist until the first export. Cleanup is best effort.
  const listing = await Filesystem.readdir({ path: EXPORT_CACHE, directory: Directory.Cache })
    .catch(() => null)
  for (const entry of listing?.files ?? []) {
    const ownedDirectory = /^(\d{13})-[a-f0-9]{24}$/.exec(entry.name)
    if (entry.type === 'directory' && ownedDirectory &&
        Date.now() - Number(ownedDirectory[1]) > CACHE_LIFETIME_MS) {
      await removeExportDirectory(`${EXPORT_CACHE}/${entry.name}`)
    }
  }
}

export const exportNativeFile: FileExporter = async (filename, blob) => {
  if (exportInProgress) {
    throw new Error('Finish the current export before starting another.')
  }
  exportInProgress = true
  let exportDirectory: string | undefined
  let shared = false

  try {
    await clearExpiredExports()
    const name = safeFilename(filename)
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(12)),
      (byte) => byte.toString(16).padStart(2, '0')).join('')
    exportDirectory = `${EXPORT_CACHE}/${Date.now()}-${nonce}`
    const { uri } = await Filesystem.writeFile({
      path: `${exportDirectory}/${name}`,
      data: await blobBase64(blob),
      directory: Directory.Cache,
      recursive: true,
    })

    try {
      await Share.share({ files: [uri], title: name, dialogTitle: 'Export file' })
    } catch (error) {
      // Share 8.0.2 rejects with this message when iOS dismisses its activity sheet.
      if (typeof error === 'object' && error !== null &&
          'message' in error && error.message === 'Share canceled') {
        return 'cancelled'
      }
      throw error
    }
    // Keep completed shares available for receivers that read the URI asynchronously.
    shared = true
    return 'completed'
  } finally {
    if (exportDirectory && !shared) await removeExportDirectory(exportDirectory)
    exportInProgress = false
  }
}
