import getStringFromNestedArray from '../../functions/get-string-from-nested-array'

// eslint-disable-next-line import/prefer-default-export
export function objectToString(errors: { [key: string]: string[] }): string {
  return getStringFromNestedArray(Object.values(errors))
}
