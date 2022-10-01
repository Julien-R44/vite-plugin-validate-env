import { Colors, FakeColors } from '@poppinss/colors'

export const colors = process.env.NODE_ENV === 'testing' ? new FakeColors() : new Colors()
