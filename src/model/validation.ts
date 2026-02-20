import { type ErrorObject } from 'ajv'
import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import projectSchema from '../../vision/project-schema-v1.json'
import type { LpProject } from '../types/project'

const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)

const validateProjectFn = ajv.compile(projectSchema)

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors || errors.length === 0) {
    return []
  }

  return errors.map((error) => {
    const at = error.instancePath || '/'
    const message = error.message ?? 'invalid value'
    return `${at}: ${message}`
  })
}

export function validateProject(input: unknown): ValidationResult {
  const valid = validateProjectFn(input)

  return {
    valid,
    errors: valid ? [] : formatErrors(validateProjectFn.errors),
  }
}

export function asProject(input: unknown): LpProject {
  return input as LpProject
}
