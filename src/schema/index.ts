import { number } from './number'
import { string } from './string'
import { boolean } from './boolean'
import { oneOf } from './oneOf'

export const Schema = {
  number,
  string,
  boolean,
  enum: oneOf,
}
