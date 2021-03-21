import { Router } from 'express'
import uploader, { UploadedFile } from 'express-fileupload'
import crypto from 'crypto'
import processImage from '../../../../../../libs/modules/image-processor'
import uploadToCloud from '../../../../../../libs/modules/storage/upload'
import uploadBuffer from '../../../../../../libs/modules/storage/upload-buffer'
import validation from '../../../../../../libs/modules/validation'
import deleteStorageItem from '../../../../../../libs/modules/storage/delete'
import logEventAction from '../../../../../../libs/modules/events/log-action'
import { event as eventGlobals } from '../../../../../../globals/importable/variables'
// Models
import { User } from '@florinrelea/sparc-shared/models'
import { Event } from '@florinrelea/sparc-shared/models'

const Models = {
  Event,
  User
}

const { MAX_ATTACHMENT_SIZE, MAX_VIDEO_SIZE, MAX_IMAGE_SIZE } = eventGlobals

const router = Router()

router.put('/attachments/:eventId', uploader(), async (req, res, next) => {
  const authId = res.locals.user
  const { eventId } = req.params
  if (!req.files || !req.files.attachments) {
    return res.status(400).json({ error: 'Expected attachments!' })
  }

  let attachments = []
  if (!Array.isArray(req.files.attachments)) {
    attachments = [req.files.attachments]
  } else {
    attachments = req.files.attachments
  }

  // Validate
  try {
    let error
    for (const file of attachments) {
      const checker = validation.file({ file, maxSize: MAX_ATTACHMENT_SIZE })
      if (checker !== true) {
        error = checker
        break
      }
    }

    if (error) {
      return res.status(400).json({ error })
    }
  } catch (e) {
    return next(e)
  }

  let event
  try {
    event = await Models.Event.findById(eventId)
  } catch (e) {
    return next(e)
  }

  if (!event) {
    return res.status(404).json({ error: 'Engagement not found' })
  }

  if (event.created_by !== authId) {
    return res.status(404).json({ error: 'Unauthorized' })
  }

  const currentAttachments = Object.values(event.attachments || {})
  if (currentAttachments.length + attachments.length > 5) {
    return res.status(401).json({ error: 'This engagement exceeded the limit of 5 attachments' })
  }

  const newFilesUrls = []

  for (const file of attachments) {
    try {
      const safeFolder = crypto.randomBytes(24).toString('hex')
      const fileUrl = await uploadToCloud(file, `default:event_attachments/${eventId}/${safeFolder}`)
      newFilesUrls.push(fileUrl)
    } catch (e) {
      console.error(e)
    }
  }

  try {
    const allAttachments = [...currentAttachments, ...newFilesUrls]
    await Models.Event.findByIdAndUpdate(eventId, {
      attachments: allAttachments
    })
  } catch (e) {
    return next(e)
  }

  return res.status(200).json({ attachmentsUrls: newFilesUrls })
})

router.put('/event-video/:eventId', uploader(), async (req, res, next) => {
  const authId = res.locals.user
  const { eventId } = req.params
  if (!req.files || !req.files.video) {
    return res.status(400).json({ error: 'Expected video' })
  }
  const videoFile = req.files.video as UploadedFile
  const checker = validation.file({ file: videoFile, type: 'video', maxSize: MAX_VIDEO_SIZE })
  if (checker !== true) {
    return res.status(400).json({ error: checker })
  }
  // Authorize

  // Check if user is host
  let event
  try {
    event = await Models.Event.findById(eventId)
  } catch (e) {
    return next(e)
  }
  if (!event) {
    return res.status(404).json({ error: 'event not found' })
  }

  if (event.created_by !== authId) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  if (Date.now() > event.timestamp_start) {
    return res.status(401).json({ error: 'You cannot make changes if the engagement passed!' })
  }

  videoFile.name = `${crypto.randomBytes(24).toString('hex')}.png`
  try {
    const link = await uploadToCloud(videoFile, `default:event_videos/${eventId}`)
    await Models.Event.findByIdAndUpdate(eventId, {
      event_video: link
    })
  } catch (e) {
    return next(e)
  }

  if (event.event_video) {
    try {
      await deleteStorageItem(event.event_video)
    } catch (e) {
      console.error(e)
    }
  }
  // Log
  try {
    await logEventAction(eventId, `Changed event video from ip: ${req.ip}`)
  } catch (e) {
    console.error(e)
  }
  return res.status(200).send()
})
router.put('/event-image/:eventId', uploader(), async (req, res, next) => {
  const authId = res.locals.user
  const { eventId } = req.params
  if (!req.files || !req.files.image) {
    return res.status(400).json({ error: 'Expected image' })
  }

  const imageFile = req.files.image as UploadedFile

  const checker = validation.file({ file: imageFile, type: 'image', maxSize: MAX_IMAGE_SIZE })
  if (checker !== true) {
    return res.status(400).json({ error: checker })
  }
  // Authorize

  // Check if user is host
  let event
  try {
    event = await Models.Event.findById(eventId)
  } catch (e) {
    return next(e)
  }
  if (!event) {
    return res.status(404).json({ error: 'event not found' })
  }

  if (event.created_by !== authId) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  if (Date.now() > event.timestamp_start) {
    return res.status(401).json({ error: 'You cannot make changes if the engagement passed!' })
  }

  try {
    const fileCode = `${crypto.randomBytes(24).toString('hex')}`

    const update = {
      event_image: '',
      event_image_lg: ''
    }
    // Store large image
    const largeImage = await processImage.fromBuffer(imageFile.data)
      .resize(600, 600).toBuffer()
    const largeImageUrl = await uploadBuffer({ path: `default:event_images/${eventId}/${fileCode}.png`, buffer: largeImage })
    update.event_image_lg = largeImageUrl

    // Store thumbnail
    const thumbnail = await processImage.fromBuffer(imageFile.data)
      .resize(150, 150).toBuffer()
    const thumbnailUrl = await uploadBuffer({ path: `default:event_images/${eventId}/${fileCode}-150x150.png`, buffer: thumbnail })
    update.event_image = thumbnailUrl
    await Models.Event.findByIdAndUpdate(eventId, update)
  } catch (e) {
    return next(e)
  }

  try {
    await deleteStorageItem(event.event_image)
    if (event.event_image_lg) await deleteStorageItem(event.event_image_lg)
  } catch (e) {
    console.error(e)
  }
  // Log
  try {
    await logEventAction(eventId, `Chaned event image from ip: ${req.ip}`)
  } catch (e) {
    console.error(e)
  }
  return res.status(200).send()
})

export default router
