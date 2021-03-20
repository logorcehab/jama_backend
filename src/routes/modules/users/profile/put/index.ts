import { Router } from 'express'
import uploader, { UploadedFile } from 'express-fileupload'
import crypto from 'crypto'
import { Event, Tag, User } from '../../../../../models'
import { IUser } from '../../../../../models/user/User'
import processImage from '../../../../../libs/modules/image-processor'
import Validator from '../../../../../libs/modules/validatorjs'
import uploadToCloud from '../../../../../libs/modules/storage/upload'
import customValidation from '../../../../../libs/modules/validation'
import deleteStorageItem from '../../../../../libs/modules/storage/delete'
import uploadBuffer from '../../../../../libs/modules/storage/upload-buffer'
import { objectToString } from '../../../../../libs/modules/validatorjs/utils'

const Models = {
  Event,
  User,
  Tag
}

const router = Router()

router.put('/additional-info', async (req, res, next) => {
  const authId = req.user
  const b = req.body
  if (!b || !b.payload) {
    return res.status(400).json({ error: 'Expected payload!' })
  }
  let rawPayload

  try {
    rawPayload = JSON.parse(b.payload) as { [key: string]: any }
  } catch (e) {
    return next(e)
  }

  // Grad expected props
  const expected: (keyof IUser['additional_info'])[] = ['hometown']
  const payload: {
    [key: string]: any
  } = {}
  for (const item of expected) {
    if (rawPayload[item]) {
      payload[item] = rawPayload[item]
    } else {
      payload[item] = null
    }
  }

  // Validate
  const rules = {
    hometown: 'string|min:3|max:100',
  }

  const validator = new Validator(payload, rules)
  if (validator.fails()) {
    return res.status(400).json({ error: objectToString(validator.errors.all()) })
  }

  // Passed all validation
  try {
    await Models.User.findByIdAndUpdate(authId, {
      'additional_info.hometown': payload.hometown
    })
  } catch (e) {
    return next(e)
  }
  return res.status(200).send()
})

router.put('/event-highlight', uploader(), async (req, res, next) => {
  const authId = req.user
  if (!req.body || !req.body.event || !req.files || !req.files.event_highlight) {
    return res.status(400).json({ error: 'wrong query' })
  }
  const eventId = req.body.event
  const eventExists = await Models.Event.exists({ _id: eventId })
  if (!eventExists) {
    return res.status(401).json({
      error: 'This event does not exist!'
    })
  }
  const checker = customValidation.file({ file: req.files.event_highlight, type: 'video', maxSize: 50000000 })
  if (checker !== true) {
    return res.status(400).json({ error: checker })
  }
  const safeFolder = crypto.randomBytes(24).toString('hex')
  try {
    const downloadURL = await uploadToCloud(req.files.event_highlight as UploadedFile, `default:event_highlights/${authId}/${safeFolder}`)
    await Models.User.findByIdAndUpdate(authId, {
      event_highlight: {
        eventId,
        video: downloadURL
      }
    })
  } catch (e) {
    return next(e)
  }
  return res.status(200).send()
})

router.put('/profile-image', uploader(), async (req, res, next) => {
  const authId = req.user
  if (!req.files || !req.files.profile_image) {
    return res.status(400).json({ error: 'Expected image' })
  }
  const safeName = crypto.randomBytes(24).toString('hex')
  const imageFile = req.files.profile_image as UploadedFile
  imageFile.name = `${safeName}.png`
  const checker = customValidation.file({ file: imageFile, type: 'image', maxSize: 5242880 })
  if (checker !== true) {
    return res.status(400).json({ error: checker })
  }
  // Get old image
  let user
  try {
    user = await Models.User.findById(authId)
  } catch (e) {
    console.error(e)
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  try {
    const update: Partial<IUser> = {
      profile_image: '',
      profile_image_lg: ''
    }
    const largeImage = await processImage.fromBuffer(imageFile.data)
      .resize(600, 600).toBuffer()
    update.profile_image = await uploadBuffer({ path: `default:profile_images/${user._id}/${safeName}.png`, buffer: largeImage })

    // Upload thumbnail
    const thumbnail = await processImage.fromBuffer(imageFile.data)
      .resize(150, 150).toBuffer()
    update.profile_image_lg = await uploadBuffer({ path: `default:profile_images/${user._id}/${safeName}-150x150.png`, buffer: thumbnail })

    await Models.User.findByIdAndUpdate(authId, update)
  } catch (e) {
    return next(e)
  }

  if (user.profile_image && !user.profile_image.includes('assets/images/avatars/')) {
    try {
      await deleteStorageItem(user.profile_image)
      if (user.profile_image_lg) await deleteStorageItem(user.profile_image_lg)
    } catch (e) {
      console.error(e)
    }
  }


  return res.status(200).json({ status: 'success' })
})
router.put('/profile', async (req, res, next) => {
  const authId = req.user
  if (!req.body || !req.body.payload) {
    return res.status(400).json({ error: 'wrong query' })
  }
  const rawPayload = req.body.payload
  // Unpack
  let form
  try {
    form = JSON.parse(rawPayload) as { [key: string]: any }
  } catch (e) {
    return next(e)
  }
  const updates: Partial<IUser> = {
    headline: form.headline || '',
    current_city: form.current_city,
    about: form.about || '',
    age: form.age || null,
    gender: form.gender || null,
    ethnicity: form.ethnicity || null,
    interest_tags: form.interest_tags,
    first_name: form.first_name,
    last_name: form.last_name,
    timezone_offset: parseInt(form.timezone_offset, 10),
    facebook: form.facebook || null,
    instagram: form.instagram || null,
    linkedin: form.linkedin || null,
    twitter: form.twitter || null,
    website: form.website || null,
    phone: form.phone || null
  }

  const validationRules = {
    first_name: 'required|string|min:2|max:100',
    last_name: 'required|string|min:2|max:100',
    headline: 'required|string|min:3|max:50',
    current_city: 'required|string|min:3|max:200',
    age: form.age ? 'required|age' : '',
    gender: 'string|min:1|max:50',
    ethnicity: 'string|min:1|max:50',
    about: 'string|min:10|max:3500',
    phone: form.phone ? 'phone' : '',
    interest_tags: 'array',
    facebook: form.facebook ? 'url-facebook' : '',
    instagran: form.instagram ? 'url-instagram' : '',
    linkedin: form.linkedin ? 'url-linkedin' : '',
    twitter: form.twitter ? 'url-twitter' : '',
    website: form.website ? 'url' : '',
    timezone_offset: 'numeric'
  }

  const formValidation = new Validator(form, validationRules)

  if (formValidation.fails()) {
    return res.status(400).json({ error: objectToString(formValidation.errors.all()) })
  }

  // Validate interest_tags
  let tagsError = false
  for (const id of (updates.interest_tags || [])) {
    try {
      const tag = await Models.Tag.findById(id)
      if (!tag) {
        tagsError = true
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (tagsError) {
    return res.status(400).json({ error: 'Invalid interests!' })
  }

  try {
    await Models.User.findByIdAndUpdate(authId, updates)
  } catch (e) {
    return next(e)
  }


  return res.status(200).json({ status: 'success' })
})

export default router
