// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  arrayBufferToBase64,
  downloadBlob,
  downloadTextFile,
  sha256Hex,
} from './files'

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

describe('file helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('encodes array buffers to base64 across internal chunks', () => {
    const bytes = new Uint8Array(0x9003)
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = i % 251
    }

    const encoded = arrayBufferToBase64(bytes.buffer)
    const expected = Buffer.from(bytes).toString('base64')
    expect(encoded).toBe(expected)
  })

  it('computes sha256 hashes as lowercase hex strings', async () => {
    const buffer = new TextEncoder().encode('abc').buffer

    await expect(sha256Hex(buffer)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('downloads blobs by creating and revoking object URLs', () => {
    const anchor = document.createElement('a')
    const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => undefined)
    const originalCreateElement = document.createElement.bind(document)

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string): HTMLElement => {
      if (tagName.toLowerCase() === 'a') {
        return anchor
      }

      return originalCreateElement(tagName)
    })

    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-download')
    const revokeObjectUrlSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined)

    const blob = new Blob(['hello world'], { type: 'text/plain' })
    downloadBlob('note.txt', blob)

    expect(createObjectUrlSpy).toHaveBeenCalledWith(blob)
    expect(anchor.href).toBe('blob:mock-download')
    expect(anchor.download).toBe('note.txt')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:mock-download')
  })

  it('wraps JSON content in an application/json blob for text downloads', async () => {
    const anchor = document.createElement('a')
    const originalCreateElement = document.createElement.bind(document)

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string): HTMLElement => {
      if (tagName.toLowerCase() === 'a') {
        return anchor
      }

      return originalCreateElement(tagName)
    })

    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-json')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(anchor, 'click').mockImplementation(() => undefined)

    downloadTextFile('project.json', '{"name":"demo"}')

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    const blobArg = createObjectUrlSpy.mock.calls[0]?.[0]
    expect(blobArg).toBeInstanceOf(Blob)

    const blob = blobArg as Blob
    expect(blob.type).toBe('application/json')
    await expect(readBlobAsText(blob)).resolves.toBe('{"name":"demo"}')
    expect(anchor.download).toBe('project.json')
  })
})
