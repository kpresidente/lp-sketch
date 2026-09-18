/** A platform delivers the file or reports that the user dismissed its save UI. */
export type FileExportResult = 'completed' | 'cancelled'

export type FileExporter = (filename: string, blob: Blob) => Promise<FileExportResult>
