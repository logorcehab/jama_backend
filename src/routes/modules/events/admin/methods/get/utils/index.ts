import textract from 'textract'
import https from 'https'

function getBufferFromUrl(url: string): Promise<Buffer> {
  return new Promise((r, j) => {
    https.get(url, (res) => {
      const data: Buffer[] = []

      res.on('data', (chunk) => {
        data.push(chunk as Buffer)
      })
      res.on('end', () => {
        r(Buffer.concat(data))
      })
    })
  })
}
async function getTextFromUrlDocument(url: string, fileName: string): Promise<string> {
  return new Promise((r, j) => {
    getBufferFromUrl(url).then(buffer => {
      textract.fromBufferWithName(fileName, buffer, (error, text) => {
        if (error) j(error)
        else r(text)
      })
    }).catch(e => j(e))
  })
}
function countOccurrencesInString(s: string, o: string): number {
  if (typeof s !== 'string') { throw new Error(`Expected String, got ${typeof s}`) }
  return (s.split(o).length - 1)
}

export {
  getBufferFromUrl,
  getTextFromUrlDocument,
  countOccurrencesInString
}
