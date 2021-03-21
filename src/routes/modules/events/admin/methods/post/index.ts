import { Router } from 'express'
import uploader, { UploadedFile } from 'express-fileupload'
import crypto from 'crypto'
import {
  Tag,
  Event, EventAttendance, EventAnalytics,
  User
} from '@florinrelea/sparc-shared/models'
import { IEvent } from '@florinrelea/sparc-shared/@types/models/event/Event'

import processImage from '../../../../../../libs/modules/image-processor'
import Validator from '../../../../../../libs/modules/validatorjs'
import uploadToCloud from '../../../../../../libs/modules/storage/upload'
import uploadBuffer from '../../../../../../libs/modules/storage/upload-buffer'
import validate from '../../../../../../libs/modules/validation'
import getCoordinatesFromAddress from '../../../../../../libs/functions/get-coordinates-from-address'
import generateEventUID from '../../../../../../libs/functions/events/generate-event-uid'
import { scheduleNotification } from '@florinrelea/sparc-shared/libs/modules/worker'
import { event as eventGlobals } from '../../../../../../globals/importable/variables'
import validateSurveyForm from '../../../../../../libs/functions/events/survey/validate-survey-form'
// Models

const { MAX_VIDEO_SIZE, MAX_IMAGE_SIZE, MAX_ATTACHMENT_SIZE } = eventGlobals
const GOOGLE_MAPS_STATIC_API_KEY = String(process.env.GOOGLE_MAPS_STATIC_API_KEY)

const Models = {
  Event,
  EventAttendance,
  EventAnalytics,
  Tag,
  User
}

function generateToken(length: number) {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

// Radius: 81m - 805 from origin
function randomizeLocation(lat: number, lng: number) {
  const randomMeters = {
    x: 57 + Math.round(Math.random() * 570),
    xDirection: Math.round(Math.random() * 1),
    y: 57 + Math.round(Math.random() * 570),
    yDirection: Math.round(Math.random() * 1)
  }
  if (randomMeters.xDirection === 0) { randomMeters.x = -randomMeters.x }
  if (randomMeters.yDirection === 0) { randomMeters.y = -randomMeters.y }
  const r = 6371
  const pi = Math.PI
  const latitude = (lat * pi) / 180
  const longitude = (lng * pi) / 180
  let pLat = Math.asin(Math.sin(latitude)
    * Math.cos((randomMeters.x / 1000) / r) + Math.cos(latitude)
    * Math.sin((randomMeters.x / 1000) / r) * Math.cos((randomMeters.x / 1000)
    * (pi / 180)))
  const pLng = ((longitude + Math.atan2(Math.sin((randomMeters.y / 1000) * (pi / 180))
    * Math.sin((randomMeters.y / 1000) / r)
    * Math.cos(latitude), Math.cos((randomMeters.y / 1000) / r) - Math.sin(latitude)
    * Math.sin(pLat))) * 180) / pi
  pLat = (pLat * 180) / pi
  return { lat: pLat, lng: pLng }
}

function GMapCircle(lat: number, lng: number, rad: number, apiKey: string, detail = 8) {
  const circleStyle = {
    stroke: {
      color: '5c7cff',
      width: 5
    },
    fillColor: '99a7ff'
  }
  let url = `https://maps.googleapis.com/maps/api/staticmap?key=${apiKey}&center=${lat},${lng}&zoom=14&size=300x300&path=color:0x${circleStyle.stroke.color}|fillcolor:0x${circleStyle.fillColor}|weight:${circleStyle.stroke.width}`
  const r = 6371
  const pi = Math.PI
  const latitude = (lat * pi) / 180
  const longitude = (lng * pi) / 180
  const d = (rad / 1000) / r
  let i = 0
  for (i = 0; i <= 360; i += detail) {
    const brng = i * (pi / 180)

    let pLat = Math.asin(Math.sin(latitude)
      * Math.cos(d) + Math.cos(latitude)
      * Math.sin(d) * Math.cos(brng))
    const pLng = ((longitude + Math.atan2(Math.sin(brng)
      * Math.sin(d) * Math.cos(latitude), Math.cos(d) - Math.sin(latitude)
      * Math.sin(pLat))) * 180) / pi
    pLat = (pLat * 180) / pi

    url += `|${pLat},${pLng}`
  }
  return encodeURI(url)
}

async function googleStaticMaps(jsonCoordinates: {
  lat: number
  lng: number
 }) {
  const coordinates = jsonCoordinates
  const randomCoordinates = randomizeLocation(coordinates.lat, coordinates.lng)

  const googleStaticMap_guest = GMapCircle(
    randomCoordinates.lat, randomCoordinates.lng, 400, GOOGLE_MAPS_STATIC_API_KEY
  )
  const googleStaticMap_accepted = `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.lat},${coordinates.lng}&zoom=14&size=300x300&maptype=roadmap&markers=color:red%7Clabel:C%7C${coordinates.lat},${coordinates.lng}&key=${process.env.GOOGLE_MAPS_STATIC_API_KEY}`

  return {
    coordinates: {
      default: { lat: randomCoordinates.lat, lng: randomCoordinates.lng },
      accepted: { lat: coordinates.lat, lng: coordinates.lng }
    },
    maps: {
      default: googleStaticMap_guest,
      accepted: googleStaticMap_accepted
    }
  }
}

const router = Router()

router.post('/create', uploader(), async (req, res, next) => {
  const authId = res.locals.user
  const b = req.body
  if (!b || !b.form) {
    return res.status(400).json({ error: 'Expected payload' })
  }

  let form
  try {
    form = JSON.parse(b.form) as Partial<IEvent>
  } catch (e) {
    return res.status(400).json({ error: 'Wrong payload! Could not parse the form!' })
  }

  if (!form.location_instructions) form.location_instructions = {}
  if (!form.settings) {
    form.settings = {
      displayed_components: {
        make_offer: false,
        message_host: true
      }
    }
  }

  // Have to collect only certain fields
  const finalForm: Partial<IEvent> = {
    event_name: form.event_name,
    event_description: form.event_description,
    timestamp_start: Number(form.timestamp_start),
    timestamp_end: Number(form.timestamp_end),
    event_type: form.event_type,
    private: form.private,
    waitlist_enabled: form.waitlist_enabled,
    display_phone: form.display_phone,
    requires_confirmation: form.requires_confirmation,
    registration_requisite: false,
    settings: {
      displayed_components: {
        make_offer: form.settings.displayed_components.make_offer,
        message_host: form.settings.displayed_components.message_host
      }
    }
  }

  finalForm.capacity = {}
  finalForm.location_instructions = {}
  finalForm.price = {}
  finalForm.tags = form.tags || []
  finalForm.attachments = []

  // Conditional props
  if (finalForm.requires_confirmation === false) {
    finalForm.waitlist_enabled = false
  }

  // Custom validators
  Validator.register('doesNotStartWithSpace', (value): boolean => !/^\s/.test(String(value)), 'Incorrect username!')
  Validator.register('event_type', (value): boolean => /^(both|virtual|in Person)$/.test(String(value)), 'Incorrect event type!')

  // Validate form
  const validationRules: {
    [key: string]: any
  } = {
    event_name: 'required|string|min:3|max:200|doesNotStartWithSpace',
    tags: 'array|min:1',
    event_description: 'required|string|min:10|max:1100',
    timestamp_start: 'numeric|min:1',
    timestamp_end: 'numeric|min:1',
    event_type: 'required|string|event_type',
    private: 'required|boolean',
    waitlist_enabled: 'required|boolean',
    display_phone: 'required|boolean',
    requires_confirmation: 'required|boolean',
    capacity: {},
    location_instructions: {},
    price: {},
    cause: {},
    charity: {},
    registration_requisite: 'required|boolean',
    settings: {
      displayed_components: {
        make_offer: 'required|boolean',
        message_host: 'required|boolean'
      }
    }
  }

  if (form.host_contact) {
    finalForm.host_contact = form.host_contact

    validationRules.host_contact = 'required|string|min:5|max:1100'
  }

  if (/^(both|virtual)$/.test(form.event_type as string)) {
    // Add to form
    finalForm.capacity.virtual = Number(form.capacity?.virtual)
    finalForm.zoom_link = String(form.zoom_link)
    finalForm.location_instructions.virtual = form.location_instructions.virtual

    validationRules.capacity.virtual = 'numeric|min:1'
    validationRules.zoom_link = 'required|string|min:2|max:200'
    validationRules.location_instructions.virtual = 'string|min:5|max:1100'
    if (form.price && form.price.virtual) {
      // Add to form
      finalForm.price.virtual = Number(form.price?.virtual)

      validationRules.price.virtual = 'numeric|min:1'
    }
  }

  if (/^(both|in Person)$/.test(String(form.event_type))) {
    // Add to form
    finalForm.capacity.inperson = Number(form.capacity?.inperson)
    // Check if it has instructions
    if (form.location_instructions.inperson) {
      finalForm.location_instructions.inperson = form.location_instructions.inperson

      validationRules.location_instructions.inperson = 'string|min:5|max:1100'
    }

    finalForm.string_location = form.string_location
    finalForm.string_address = form.string_address

    validationRules.capacity.inperson = 'numeric|min:1'
    validationRules.string_location = 'string|min:5|max:1000'
    validationRules.string_address = 'required|string|min:5|max:1000'
    if (form.price && form.price.inperson) {
      // Add to form
      finalForm.price.inperson = Number(form.price.inperson)

      validationRules.price.inperson = 'numeric|min:1'
    }
  }

  if (Object.keys(finalForm.price).length) {
    // Init earnings property
    finalForm.earnings = 0
    // Remove confirmation if paid
    finalForm.requires_confirmation = false
  }
  if (form.registration_file && form.registration_file.title) {
    // This prop will be useful on the front-end
    finalForm.registration_requisite = true

    // Add to form
    finalForm.registration_file = form.registration_file

    validationRules.registration_file = {
      title: 'required|string|min:5|max:200',
      required: 'required|boolean'
    }
  }

  if (form.registration_form && form.registration_form.title) {
    // This prop will be useful on the front-end
    finalForm.registration_requisite = true

    // Add to form
    finalForm.registration_form = form.registration_form

    validationRules.registration_form = {
      title: 'required|string|min:5|max:200',
      required: 'required|boolean',
      packed_form: 'required|string'
    }

    const err = (e: string) => res.status(400).json({ error: `Your requisite form is wrong! ${e}` })
    // Validate
    try {
      validateSurveyForm(form.registration_form.packed_form)
    } catch (e) {
      return err(e.message)
    }
  }

  if (form.price && form.cause) {
    // Cause === charity name
    if (typeof form.cause !== 'object' || form.cause.length > 2) {
      return res.status(400).json({ error: 'Invalid charity!' })
    }
    // Charity === percentages
    if (!form.charity || typeof form.capacity !== 'object' || form.charity.length === 0 || form.charity.length > 2) {
      return res.status(400).json({ error: 'Invalid charity!' })
    }

    // Add to form
    finalForm.cause = [
      form.cause[0]
    ]
    finalForm.charity = [
      Number(form.charity[0])
    ]
    validationRules.cause[0] = 'required|string|min:5|max:100'
    validationRules.charity[0] = 'required|numeric|min:1|max:100'

    // Second cause
    if (form.cause[1]) {
      if (!form.charity[1]) {
        return res.status(400).json({ error: 'Expected second charity percentage' })
      }
      if (Number(form.charity[0]) + Number(form.charity[1]) > 100) {
        return res.status(400).json({ error: 'Invalid charity percentages!' })
      }
      // Add to form
      // eslint-disable-next-line prefer-destructuring
      finalForm.cause[1] = form.cause[1]
      finalForm.charity[1] = Number(form.charity[1])

      validationRules.cause[1] = 'required|string|min:5|max:100'
      validationRules.charity[1] = 'required|numeric|min:1|max:100'
    }
  }

  const afterValidation = new Validator(finalForm, validationRules)

  if (afterValidation.fails()) {
    return res.status(400).json({ error: afterValidation.errors.all() })
  }

  // Validate tags
  const tagsChecker = []
  for (const tagId of finalForm.tags) {
    tagsChecker.push(Models.Tag.findById(tagId))
  }

  let databaseTags = []
  try {
    databaseTags = await Promise.all(tagsChecker)
  } catch (e) {
    return next(e)
  }

  let invalidTags = false
  databaseTags.forEach(object => {
    if (!object) {
      invalidTags = true
    }
  })

  if (invalidTags) {
    return res.status(400).json({ error: 'Invalid tags!' })
  }

  let eventLocationCoordinates
  // Validate location
  if (/^(in Person|both)$/.test(String(form.event_type))) {
    try {
      eventLocationCoordinates = await getCoordinatesFromAddress(String(form.string_address))
    } catch (e) {
      return next(e)
    }
  }

  // Validate files
  if (!req.files || !req.files.image) {
    return res.status(400).json({ error: 'Expected event image!' })
  }

  // Validate image
  const isValidImage = validate.file({ file: req.files.image as UploadedFile, type: 'image', maxSize: MAX_IMAGE_SIZE })
  if (isValidImage !== true) {
    return res.status(400).json({ error: `Profile Image Error: ${isValidImage}` })
  }

  // Validate video
  if (req.files.video) {
    const checker = validate.file({ file: req.files.video as UploadedFile, type: 'video', maxSize: MAX_VIDEO_SIZE })
    if (checker !== true) {
      return res.status(400).json({ error: `Profile Video Error: ${checker}` })
    }
  }

  // Validate attachments
  const maxAttachments = 5
  for (let index = 0; index < maxAttachments; index += 1) {
    if (req.files[`attachment_${index}`]) {
      const checker = validate.file({ file: req.files[`attachment_${index}`] as UploadedFile, maxSize: MAX_ATTACHMENT_SIZE })
      if (checker !== true) {
        return res.status(400).json({ error: `Attachment (${index}) Error - ${checker}` })
      }
    }
  }

  // Get event id
  let eventId = null
  try {
    eventId = await generateEventUID()
  } catch (e) {
    return next(e)
  }

  finalForm._id = eventId

  // Passed the validation

  // Increase the event tags count
  const increaseTagsJob = []
  for (const index in finalForm.tags) {
    const tagId = finalForm.tags[index]
    const currentTag = databaseTags[index]
    if (!currentTag) continue
    const currentCount = currentTag.count
    increaseTagsJob.push(Models.Tag.findByIdAndUpdate(tagId, {
      count: currentCount + 1
    }))
  }

  try {
    await Promise.all(increaseTagsJob)
  } catch (e) {
    return next(e)
  }

  // Store all files after validation (do not store any file if all the files are not valid)

  try {
    // Store image
    if (req.files.image) {
      // This if helps the memory cleaning (see block scopes)
      const fileCode = `${crypto.randomBytes(24).toString('hex')}`

      // Store large image
      const largeImage = await processImage.fromBuffer((req.files.image as UploadedFile).data)
        .resize(600, 600).toBuffer()
      const largeImageUrl = await uploadBuffer({ path: `default:event_images/${eventId}/${fileCode}.png`, buffer: largeImage })
      finalForm.event_image_lg = largeImageUrl

      // Store thumbnail
      const thumbnail = await processImage.fromBuffer((req.files.image as UploadedFile).data)
        .resize(150, 150).toBuffer()
      const thumbnailUrl = await uploadBuffer({ path: `default:event_images/${eventId}/${fileCode}-150x150.png`, buffer: thumbnail })
      finalForm.event_image = thumbnailUrl
    }

    // Store video
    if (req.files.video) {
      const safeFolder = crypto.randomBytes(24).toString('hex')
      const linkVideo = await uploadToCloud(req.files.video as UploadedFile, `default:event_videos/${eventId}/${safeFolder}`)
      finalForm.event_video = linkVideo
    }

    // Store attachments
    for (let index = 0; index < maxAttachments; index += 1) {
      if (req.files[`attachment_${index}`]) {
        const safeFolder = crypto.randomBytes(24).toString('hex')
        const attachmentLink = await uploadToCloud(req.files[`attachment_${index}`] as UploadedFile, `default:event_attachments/${eventId}/${safeFolder}`)
        finalForm.attachments.push(attachmentLink)
      }
    }
  } catch (e) {
    return next(e)
  }

  // Set author
  finalForm.created_by = authId

  // If maps
  if (eventLocationCoordinates) {
    const location = await googleStaticMaps(eventLocationCoordinates)
    finalForm.maps = {
      default: location.maps.default,
      accepted: location.maps.accepted
    }
    finalForm.locations = {
      default: JSON.stringify(location.coordinates.default),
      accepted: JSON.stringify(location.coordinates.accepted)
    }
  }

  // Generate attendance code
  const confirmationCode = generateToken(5)
  try {
    // Store attendance code
    await new Models.EventAttendance({
      _id: eventId,
      code: confirmationCode
    }).save()
    // Store event
    await new Models.Event(finalForm).save()
    // Add id to hosted events
    await Models.User.findByIdAndUpdate(authId, {
      $push: {
        hosted_events: eventId
      },
      $inc: {
        number_of_hosted_events: 1
      }
    })
    // Add creating timestamp
    const creationTimestamp = Date.now()
    await new Models.EventAnalytics({
      _id: eventId,
      views: {
        [creationTimestamp]: 0
      },
      creation_timestamp: creationTimestamp
    }).save()
  } catch (e) {
    return next(e)
  }

  // Send notifications
  try {
    if (!finalForm.private) {
      await scheduleNotification.events.newEventCreatedFollowersNotification({ event_id: eventId })
    }
  } catch (e) {
    console.error(e)
  }

  return res.status(200).send()
})

export default router
