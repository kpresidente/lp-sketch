const crypto = require('node:crypto')
const { BlobServiceClient } = require('@azure/storage-blob')

const CONTAINER_NAME = 'reports'
const TITLE_MAX_LENGTH = 120
const DETAILS_MAX_LENGTH = 4000
const REPRO_MAX_LENGTH = 4000

function clampText(value, maxLength) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, maxLength)
}

function asObject(value) {
  return value && typeof value === 'object' ? value : null
}

function parseBody(req) {
  if (req && req.body && typeof req.body === 'object') {
    return req.body
  }

  if (typeof req?.rawBody === 'string') {
    try {
      return JSON.parse(req.rawBody)
    } catch {
      return null
    }
  }

  return null
}

function response(status, payload) {
  return {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
    body: payload,
  }
}

function validateReportInput(body) {
  const type = body?.type === 'feature' ? 'feature' : body?.type === 'bug' ? 'bug' : null
  const title = clampText(body?.title, TITLE_MAX_LENGTH)
  const details = clampText(body?.details, DETAILS_MAX_LENGTH)
  const reproSteps = clampText(body?.reproSteps, REPRO_MAX_LENGTH)
  const metadata = asObject(body?.metadata)

  if (!type) {
    return { error: 'Report type must be "bug" or "feature".' }
  }

  if (title.length < 3) {
    return { error: 'Title must be at least 3 characters.' }
  }

  if (details.length < 10) {
    return { error: 'Details must be at least 10 characters.' }
  }

  return {
    value: {
      type,
      title,
      details,
      reproSteps: reproSteps.length > 0 ? reproSteps : null,
      metadata,
    },
  }
}

function sanitizeMetadata(metadata) {
  if (!metadata) {
    return {}
  }

  const safe = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string') {
      safe[key] = value.slice(0, 512)
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      safe[key] = value
    } else if (value && typeof value === 'object') {
      safe[key] = value
    }
  }

  return safe
}

function buildBlobName(now, reportId) {
  const iso = now.toISOString()
  const datePrefix = iso.slice(0, 10)
  const timePart = iso.slice(11, 19).replace(/:/g, '-')
  return `${datePrefix}/${timePart}-${reportId}.json`
}

module.exports = async function reportFunction(context, req) {
  const body = parseBody(req)
  if (!body) {
    context.res = response(400, {
      ok: false,
      error: 'Invalid JSON body.',
    })
    return
  }

  const validation = validateReportInput(body)
  if (validation.error) {
    context.res = response(400, {
      ok: false,
      error: validation.error,
    })
    return
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  if (!connectionString) {
    context.log.error('AZURE_STORAGE_CONNECTION_STRING is not configured.')
    context.res = response(500, {
      ok: false,
      error: 'Report storage is not configured.',
    })
    return
  }

  const reportId = crypto.randomUUID()
  const now = new Date()
  const reportRecord = {
    reportId,
    receivedAt: now.toISOString(),
    ...validation.value,
    metadata: sanitizeMetadata(validation.value.metadata),
  }

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME)
    await containerClient.createIfNotExists()

    const blobName = buildBlobName(now, reportId)
    const blobClient = containerClient.getBlockBlobClient(blobName)
    const content = JSON.stringify(reportRecord, null, 2)

    await blobClient.upload(content, Buffer.byteLength(content), {
      blobHTTPHeaders: {
        blobContentType: 'application/json; charset=utf-8',
      },
    })

    context.res = response(202, {
      ok: true,
      message: 'Report received.',
      reportId,
    })
  } catch (error) {
    context.log.error('Failed to persist report.', error)
    context.res = response(500, {
      ok: false,
      error: 'Unable to persist report.',
    })
  }
}
