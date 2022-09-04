export class Exception extends Error {
  public code?: string

  constructor(message: string, code?: string) {
    super(message)

    this.name = this.constructor.name
    this.message = message
    this.code = code

    Error.captureStackTrace(this, this.constructor)
  }
}
