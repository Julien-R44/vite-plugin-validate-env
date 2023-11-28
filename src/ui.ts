import { cliui } from '@poppinss/cliui'

export type UI = ReturnType<typeof initUi>

export function initUi() {
  return cliui({ mode: process.env.NODE_ENV === 'testing' ? 'raw' : 'normal' })
}
