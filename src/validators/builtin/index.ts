import { ui } from '../../utils/cliui.js'
import type { PoppinsSchema } from '../../contracts/index.js'

export function errorReporter(errors: any[]) {
  let finalMessage = ui.colors.red('Failed to validate environment variables : \n')

  for (const error of errors) {
    const errorKey = `[${ui.colors.magenta(error.key)}]`
    finalMessage += `\n${errorKey}: \n`

    const message = error.err.message.replace(`${error.err.code}: `, '')
    finalMessage += `  ${ui.colors.yellow(message)} \n`
  }

  return finalMessage as string
}

/**
 * Validate the env values with builtin validator
 */
export function builtinValidation(env: Record<string, string>, schema: PoppinsSchema) {
  const errors = []
  const variables = []

  for (const [key, validator] of Object.entries(schema!)) {
    try {
      const res = validator(key, env[key])

      // Handle undefined aka optional results
      if (typeof res === 'undefined') continue

      variables.push({ key, value: res })
    } catch (err) {
      errors.push({ key, err })
    }
  }

  if (errors.length) {
    throw new Error(errorReporter(errors))
  }

  return variables
}
