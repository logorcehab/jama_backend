import AWS from 'aws-sdk'
import { cloudFolders } from './vars'

const s3Params = {
  Bucket: process.env.STORAGE_BUCKET_NAME
}
const cloudStorage = new AWS.S3({
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey,
  params: {
    ...s3Params
  }
})

async function uploadBuffer(
  { path, buffer, type }:
    { path: string, buffer: string, type?: string }
): Promise<string> {
  let mimetype = 'image/png'
  if (path.includes('.png')) {
    mimetype = 'image/png'
  }
  // Validation
  if (!path || !buffer) {
    throw new Error('Expected parameters: {path, buffer, type}')
  }
  let cloudPath = path

  // Max 80MB
  if (buffer.length > 80000000) {
    throw new Error('Buffer exceeded the limit of 80MB')
  }
  // Defaults
  if (cloudPath.includes('default:')) {
    const defaultPath = cloudPath.substr(0, cloudPath.indexOf('/'))
    const folder = defaultPath.replace('default:', '')
    cloudPath = cloudPath.replace(defaultPath, cloudFolders[folder])
  }

  if (cloudPath.startsWith('/')) cloudPath = cloudPath.slice(1)

  const config = {
    Key: cloudPath,
    Body: buffer,
    ContentType: mimetype,
    ...s3Params
  }
  const data = await cloudStorage.upload(config).promise()
  return data.Location
}

export default uploadBuffer
