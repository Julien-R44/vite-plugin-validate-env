import useColors from '@poppinss/colors'

export const colors = process.env.NODE_TEST === 'testing' ? useColors.raw() : useColors.ansi()
