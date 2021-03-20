import https from 'https'

const httpsRequest = {
  get: (url: string): Promise<any> => new Promise((res01, rej01) => {
    const request = https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        res01(data)
      })
      res.on('error', (e) => {
        rej01(e)
      })
    })
    request.end()
  })
}

export default httpsRequest
