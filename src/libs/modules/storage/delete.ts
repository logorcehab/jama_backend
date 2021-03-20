import AWS from 'aws-sdk'
import { ServerLog } from '../../../models'

const awsParams = {
  Bucket: process.env.STORAGE_BUCKET_NAME as string
}

const cloudStorage = new AWS.S3({
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey,
  params: { ...awsParams }
})

export default async function deleteStorageItem(fullUrl: string): Promise<void> {
  if (!fullUrl) {
    throw new Error('Unexpected parameters!')
  }
  const key = fullUrl.replace(`https://s3.amazonaws.com/${process.env.STORAGE_BUCKET_NAME}/`, '')
  const config = {
    Key: decodeURIComponent(key),
    ...awsParams
  }

  return new Promise((r, j) => {
    cloudStorage.deleteObject(config, async (err) => {
      if (err) {
        return j(new Error(err.message))
      }
      await new ServerLog({
        timestamp: Date.now(),
        message: `${key} removed from storage bucket`
      }).save()
      return r()
    })
  })
}
