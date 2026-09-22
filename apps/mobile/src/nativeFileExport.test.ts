import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { exportNativeFile } from './nativeFileExport'

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: { writeFile: vi.fn(), readdir: vi.fn(), rmdir: vi.fn() },
}))
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn() } }))

const pdf = () => new Blob([
  new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0, 255]),
], { type: 'application/pdf' })

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)
  vi.mocked(Filesystem.readdir).mockResolvedValue({ files: [] })
  vi.mocked(Filesystem.rmdir).mockResolvedValue(undefined)
  vi.mocked(Filesystem.writeFile).mockImplementation(async ({ path }) => ({
    uri: `file:///app-cache/${encodeURI(path)}`,
  }))
  vi.mocked(Share.share).mockResolvedValue({ activityType: 'com.apple.DocumentManager' })
})
afterEach(() => vi.restoreAllMocks())

describe('native file export', () => {
  it('preserves binary bytes and shares a native file URI rather than a browser blob URL', async () => {
    expect(await exportNativeFile('Roof.pdf', pdf())).toBe('completed')
    expect(Filesystem.writeFile).toHaveBeenCalledTimes(1)
    const written = vi.mocked(Filesystem.writeFile).mock.calls[0][0]
    expect(written).toEqual({
      path: expect.stringMatching(/^lp-sketch-exports\/1800000000000-[a-f0-9]{24}\/Roof\.pdf$/),
      data: 'JVBERi0xLjcA/w==',
      directory: Directory.Cache,
      recursive: true,
    })
    expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({
      files: [`file:///app-cache/${written.path}`],
    }))
    // Receiving apps may still read the URI after the sheet closes.
    expect(Filesystem.rmdir).not.toHaveBeenCalled()
  })

  it('keeps unsafe project names inside the export directory and preserves the extension', async () => {
    await exportNativeFile('../roof\\plans:revised.pdf', pdf())
    expect(Filesystem.writeFile).toHaveBeenCalledTimes(1)
    const { path } = vi.mocked(Filesystem.writeFile).mock.calls[0][0]
    expect(path.split('/')).toHaveLength(3)
    expect(path.split('/')[2]).toBe('_roof_plans_revised.pdf')
    expect(path).not.toContain('..')
  })

  it('limits long Unicode filenames without losing their extension', async () => {
    await exportNativeFile(`${'屋'.repeat(120)}.pdf`, pdf())
    expect(Filesystem.writeFile).toHaveBeenCalledTimes(1)
    const name = vi.mocked(Filesystem.writeFile).mock.calls[0][0].path.split('/').at(-1)!
    expect(new TextEncoder().encode(name).length).toBeLessThanOrEqual(240)
    expect(name.endsWith('.pdf')).toBe(true)
    expect(name.startsWith('屋')).toBe(true)
  })

  it.each([
    [' .lps', 'LP-Sketch.lps'],
    ['..lps', 'LP-Sketch.lps'],
    ['..pdf', 'LP-Sketch.pdf'],
    ['..png', 'LP-Sketch.png'],
    ['..jpg', 'LP-Sketch.jpg'],
  ])('preserves the file type when %s has no usable project name', async (filename, expected) => {
    await exportNativeFile(filename, pdf())
    expect(Filesystem.writeFile).toHaveBeenCalledTimes(1)
    const name = vi.mocked(Filesystem.writeFile).mock.calls[0][0].path.split('/').at(-1)
    expect(name).toBe(expected)
  })

  it('does not overwrite an earlier export with the same filename', async () => {
    await exportNativeFile('Roof.pdf', pdf())
    await exportNativeFile('Roof.pdf', pdf())
    expect(Filesystem.writeFile).toHaveBeenCalledTimes(2)
    const calls = vi.mocked(Filesystem.writeFile).mock.calls
    expect(calls[0][0].path).not.toBe(calls[1][0].path)
  })

  it('awaits the share sheet and treats the iOS cancellation response as cancellation', async () => {
    let dismiss!: (reason: Error) => void
    vi.mocked(Share.share).mockImplementationOnce(() => new Promise((_, reject) => { dismiss = reject }))
    let finished = false
    const result = exportNativeFile('Roof.pdf', pdf()).then((value) => { finished = true; return value })
    await vi.waitFor(() => expect(Share.share).toHaveBeenCalledTimes(1))
    expect(finished).toBe(false)
    expect(Filesystem.rmdir).not.toHaveBeenCalled()
    dismiss(new Error('Share canceled'))
    expect(await result).toBe('cancelled')
    const { path } = vi.mocked(Filesystem.writeFile).mock.calls[0][0]
    expect(Filesystem.rmdir).toHaveBeenCalledWith({
      directory: Directory.Cache, path: path.slice(0, path.lastIndexOf('/')), recursive: true,
    })
  })

  it('propagates share failures and permits a later attempt', async () => {
    vi.mocked(Share.share).mockRejectedValueOnce(new Error('Error sharing item'))
    await expect(exportNativeFile('Roof.pdf', pdf())).rejects.toThrow('Error sharing item')
    expect(Filesystem.rmdir).toHaveBeenCalledTimes(1)
    await expect(exportNativeFile('Roof.pdf', pdf())).resolves.toBe('completed')
  })

  it('preserves write failures even if cleanup also fails, and never opens the sheet', async () => {
    vi.mocked(Filesystem.writeFile).mockRejectedValueOnce(new Error('Not enough storage'))
    vi.mocked(Filesystem.rmdir).mockRejectedValueOnce(new Error('Directory does not exist'))
    await expect(exportNativeFile('Roof.pdf', pdf())).rejects.toThrow('Not enough storage')
    expect(Share.share).not.toHaveBeenCalled()
  })

  it('removes only old directories created by this exporter', async () => {
    const names = [
      '1799900000000-aaaaaaaaaaaaaaaaaaaaaaaa',
      '1800000000000-bbbbbbbbbbbbbbbbbbbbbbbb',
      '../other-app-data',
      'unrelated-folder',
    ]
    vi.mocked(Filesystem.readdir).mockResolvedValueOnce({
      files: names.map((name) => ({ name, type: 'directory', size: 0, ctime: 0, mtime: 0, uri: `file:///app-cache/${name}` })),
    })
    await exportNativeFile('Roof.pdf', pdf())
    expect(Filesystem.rmdir).toHaveBeenCalledExactlyOnceWith({
      path: 'lp-sketch-exports/1799900000000-aaaaaaaaaaaaaaaaaaaaaaaa',
      directory: Directory.Cache,
      recursive: true,
    })
  })

  it('rejects overlapping exports without interrupting the active share sheet', async () => {
    let finish!: (result: { activityType: string }) => void
    vi.mocked(Share.share).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const first = exportNativeFile('Roof.pdf', pdf())
    await vi.waitFor(() => expect(Share.share).toHaveBeenCalledTimes(1))
    await expect(exportNativeFile('Other.pdf', pdf())).rejects.toThrow('Finish the current export')
    expect(Filesystem.writeFile).toHaveBeenCalledTimes(1)
    finish({ activityType: 'com.apple.DocumentManager' })
    expect(await first).toBe('completed')
  })
})
