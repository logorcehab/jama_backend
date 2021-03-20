import AWS from 'aws-sdk'
import crypto from 'crypto'
import { UploadedFile } from 'express-fileupload'
import { cloudFolders } from './vars.js'
import validate from '../validation'

const awsParams = {
  Bucket: process.env.STORAGE_BUCKET_NAME
}

const cloudStorage = new AWS.S3({
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey,
  params: { ...awsParams }
})

async function uploadToCloud(
  file: UploadedFile,
  cloudPath: string
): Promise<string> {
  // Validation
  if (!file || !cloudPath) {
    throw new Error('Expected parameters: [file, folder]')
  }
  let path = cloudPath
  // Max 80MB
  const checker = validate.file({ file, maxSize: 80000000 })
  if (checker !== true) {
    throw new Error(checker)
  }
  // Defaults
  if (path.includes('default:')) {
    const defaultPath = path.substr(0, path.indexOf('/'))
    const folder = defaultPath.replace('default:', '')
    path = path.replace(defaultPath, cloudFolders[folder])
  }

  if (path.startsWith('/')) path = path.slice(1)
  if (!path.endsWith('/')) path += '/'
  const undefinedName = crypto.randomBytes(24).toString('hex')
  const fileName = file.name ? file.name : undefinedName
  const config = {
    Key: `${path}${fileName}`,
    Body: file.data,
    ...awsParams
  }
  const data: {
    Location: string
  } = await cloudStorage.upload(config).promise()
  return data.Location
}
export default uploadToCloud
