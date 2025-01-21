import type { UI } from '../../ui.js'
import type { StandardSchema } from '../../types.js'

export function errorReporter(ui: UI, errors: any[]) {
  let finalMessage = ui.colors.red('Failed to validate environment variables : \n')

  for (const error of errors) {
    const errorKey = `[${ui.colors.magenta(error.key)}]`
    finalMessage += `\n${errorKey}: \n`

    const message = `Invalid value for "${error.key}" : ${error.err.issues[0].message}`
    finalMessage += `  ${ui.colors.yellow(message)} \n`
  }

  return finalMessage as string
}

export async function standardValidation(
  ui: UI,
  env: Record<string, string>,
  schema: StandardSchema,
) {
  const errors = []
  const variables = []

  for (const [key, validator] of Object.entries(schema)) {
    const result = await validator['~standard'].validate(env[key])

    if (result.issues) {
      errors.push({ key, err: result })
      continue
    }

    variables.push({ key, value: result.value })
  }

  if (errors.length) {
    throw new Error(errorReporter(ui, errors))
  }

  return variables
}
