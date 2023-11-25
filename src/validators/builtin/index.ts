import { colors } from '../../utils/colors.js'
import type { PoppinsSchema } from '../../contracts/index.js'

export function errorReporter(errors: any[]) {
  let finalMessage = colors.red('Failed to validate environment variables : \n')

  for (const error of errors) {
    const errorKey = `[${colors.magenta(error.key)}]`
    finalMessage += `\n${errorKey}: \n`

    const message = error.err.message.replace(`${error.err.code}: `, '')
    finalMessage += `  ${colors.yellow(message)} \n`
  }

  return finalMessage as string
}

/**
 * Validate the env values with builtin validator
 */
export function builtinValidation(env: Record<string, string>, schema: PoppinsSchema) {
  const errors = []

  for (const [key, validator] of Object.entries(schema!)) {
    try {
      const res = validator(key, env[key])

      // Handle undefined aka optional results
      if (typeof res === 'undefined') {
        delete process.env[key]
        continue
      }

      process.env[key] = res
    } catch (err) {
      errors.push({ key, err })
    }
  }

  if (errors.length) {
    throw new Error(errorReporter(errors))
  }
}
