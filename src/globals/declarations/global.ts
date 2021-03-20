// tslint:disable-next-line: no-namespace
declare namespace NodeJS {
  interface Global {
    cdn: string
    CDN: string
    SERVER_URL: string
    TAX: number
    TAX_FACTOR: number
    errorHandler: any
    log_err: any
    logAction: any
    TypeUtils: {
      Object(input: any): {
        hasNestedProperty(nestedProp: string): boolean
      }
    }
  }
}
