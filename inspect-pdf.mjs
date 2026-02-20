import fs from 'fs'
import { PDFDocument } from 'pdf-lib'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const bytes = fs.readFileSync('Untitled-LP-Sketch.pdf')
const pdfLibDoc = await PDFDocument.load(bytes)
const page = pdfLibDoc.getPage(0)
console.log('pdf-lib size', page.getWidth(), page.getHeight())
console.log('pdf-lib rotation', page.getRotation().angle)
for (const name of ['MediaBox','CropBox','BleedBox','TrimBox','ArtBox']) {
  const fn = page[`get${name}`]
  if (typeof fn === 'function') {
    const box = fn.call(page)
    console.log(name, box)
  }
}

const loadingTask = getDocument({ data: bytes })
const pdfJsDoc = await loadingTask.promise
const pdfJsPage = await pdfJsDoc.getPage(1)
const viewport = pdfJsPage.getViewport({ scale: 1 })
console.log('pdf.js viewport', { width: viewport.width, height: viewport.height, rotation: viewport.rotation })
console.log('pdf.js view', pdfJsPage.view)
