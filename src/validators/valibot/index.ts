import * as v from 'valibot'

import type { UI } from '../../ui.js'
import type { ValibotSchema } from '../../types.js'

type ValibotValidationError = {
  key: string
  err: v.BaseIssue<unknown>[]
}

export function errorReporter(ui: UI, errors: ValibotValidationError[]) {
  let finalMessage = ui.colors.red('Failed to validate environment variables : \n')

  for (const error of errors) {
    const errorKey = `[${ui.colors.magenta(error.key)}]`
    finalMessage += `\n${errorKey}: \n`

    const message = `Invalid value for "${error.key}" : ${error.err[0].message}`
    finalMessage += `  ${ui.colors.yellow(message)} \n`
  }

  return finalMessage
}

/**
 * Validate the env values with Valibot validator
 */
export async function valibotValidation(
  ui: UI,
  env: Record<string, string>,
  schema: ValibotSchema,
) {
  const errors = []
  const variables = []

  for (const [key, validator] of Object.entries(schema!)) {
    const result = v.safeParse(validator, env[key])

    if (!result.success) {
      errors.push({ key, err: result.issues })
      continue
    }

    // Handle undefined aka optional results
    if (typeof result.output === 'undefined') continue

    variables.push({ key, value: result.output as any })
  }

  if (errors.length) {
    throw new Error(errorReporter(ui, errors))
  }

  return variables
}
