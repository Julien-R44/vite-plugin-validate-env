import { cliui } from '@poppinss/cliui'

export const ui = cliui({ mode: process.env.NODE_ENV === 'testing' ? 'raw' : 'normal' })
