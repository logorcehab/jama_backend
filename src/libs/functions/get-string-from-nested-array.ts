export default function getStringFromNestedArray(array: any[]): string {
  let result = ''
  array.forEach((item, index) => {
    const e: string | [any] = item
    let eString
    const f: string | [any] = array[index + 1]
    let fString
    if (Array.isArray(e)) {
      eString = getStringFromNestedArray(e)
    } else {
      eString = e
    }
    if (Array.isArray(f)) {
      fString = getStringFromNestedArray(f)
    } else {
      fString = f
    }

    if (eString) {
      result += eString
    }
    if (eString && fString) {
      result += '\n'
    }
    if (fString) {
      result += `${fString}\n`
    }
  })
  return result
}
