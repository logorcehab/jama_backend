import AWS from 'aws-sdk'

const s3 = new AWS.S3({
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey,
  params: {
    Bucket: 'cdn.sparc.world'
  }
})

async function generateAccessUrl(rawUrl: string): Promise<string> {
  const path = rawUrl.replace(`https://s3.amazonaws.com/${process.env.STORAGE_BUCKET_NAME}/`, '')
  const cloudKey = decodeURIComponent(path.split('+').join(' '))
  const url: string = await new Promise((resolve, reject) => {
    s3.getSignedUrl('getObject', {
      Key: cloudKey,
      Expires: 86400
    },
    (err, generatedUrl) => {
      if (err) {
        return reject(err)
      }
      return resolve(generatedUrl)
    })
  })
  return url
}

export {
  generateAccessUrl
}
