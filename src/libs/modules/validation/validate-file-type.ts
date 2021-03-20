import FileType from 'file-type'

function fileTypeExtender(fileName: string) {
  const targetName = fileName.toLowerCase()
  let ext = ''
  let mime = ''
  if (targetName.endsWith('.txt')) {
    ext = 'txt'
    mime = 'text/plain'
  } else if (targetName.endsWith('.csv')) {
    ext = 'csv'
    mime = 'text/csv'
  } else if (targetName.endsWith('.svg')) {
    ext = 'svg'
    mime = 'image/svg+xml'
  }

  if (ext && mime) {
    return {
      ext,
      mime
    }
  }

  return undefined
}

async function validateFile(buffer: ArrayBuffer, fileName: string) {
  const defaultValidation = await FileType.fromBuffer(buffer)

  if (defaultValidation) {
    return {
      ext: defaultValidation.ext,
      mime: defaultValidation.mime
    }
  }

  const extender = fileTypeExtender(fileName)

  if (extender) {
    return {
      ext: extender.ext,
      mime: extender.mime
    }
  }

  throw new Error(`Invalid file "${fileName}"`)
}

export default validateFile
