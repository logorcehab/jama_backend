/* eslint-disable no-unused-vars */
import fs from 'fs'

function renderer({ filePath, data }: { filePath: string, data: any }): string {
  const htmlTemplate = fs.readFileSync(filePath, { encoding: 'utf-8' })
  try {
    // tslint:disable-next-line: no-eval
    const renderedHtml = eval(`\`${htmlTemplate}\``)
    return renderedHtml
  } catch (e) {
    console.error('Failed to render the html!')
    throw e
  }
}

export default renderer
