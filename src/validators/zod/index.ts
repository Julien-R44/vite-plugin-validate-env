import type { ZodSchema } from 'zod'

import { ui } from '../../utils/cliui.js'

export function errorReporter(errors: any[]) {
  let finalMessage = ui.colors.red('Failed to validate environment variables : \n')

  for (const error of errors) {
    const errorKey = `[${ui.colors.magenta(error.key)}]`
    finalMessage += `\n${errorKey}: \n`

    const message = `Invalid value for "${error.key}" : ${error.err.issues[0].message}`
    finalMessage += `  ${ui.colors.yellow(message)} \n`
  }

  return finalMessage as string
}

/**
 * Validate the env values with Zod validator
 */
export async function zodValidation(env: Record<string, string>, schema: ZodSchema) {
  const errors = []
  const variables = []

  for (const [key, validator] of Object.entries(schema!)) {
    const result = validator.safeParse(env[key])

    if (!result.success) {
      errors.push({ key, err: result.error })
      continue
    }

    // Handle undefined aka optional results
    if (typeof result.data === 'undefined') continue

    variables.push({ key, value: result.data })
  }

  if (errors.length) {
    throw new Error(errorReporter(errors))
  }

  return variables
}
