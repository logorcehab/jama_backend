import { Router } from 'express'
import pdf from 'pdf-parse'
import convertHTMLToPDF from 'html-pdf'
import fs from 'fs'
import AWS from 'aws-sdk'
import {
  Tag,
  Event, EventAnalytics, EventAttendance,
  User
} from '@florinrelea/sparc-shared/models'
import { IEvent } from '@florinrelea/sparc-shared/@types/models/event/Event'

import getAllRegistrantsIdsFromEvent from '../../../../../../libs/functions/get-all-registrants-ids-and-types-from-event'
import generatePublicEvent from '../../../../../../libs/modules/events/generate-public-event'
import eventAnalytics from '../../../../../../libs/modules/events/analytics'
import generategetPublicUser, { IPublicUser } from '../../../../../../libs/functions/users/generate-public-user'
import { getBufferFromUrl, getTextFromUrlDocument, countOccurrencesInString } from './utils'

import usersThatConfirmedAttendance from './users-that-confirmed-attendance'
import searchKeywordsInRequisites from './search-keywords-in-requisites'
// Models

const Models = {
  Event,
  User,
  EventAnalytics,
  EventAttendance,
  Tag
}

const router = Router()

router.use('/users-that-confirmed-attendance', usersThatConfirmedAttendance)

const cloudStorage = new AWS.S3({
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey,
  params: {
    Bucket: 'cdn.sparc.world'
  }
})

router.get('/basic-registrants-list/:eventId', async (req, res, next) => {
  const { eventId } = req.params
  const authId = res.locals.user

  let event
  const results = []

  try {
    event = await Models.Event.findById(eventId)
  } catch (e) {
    return next(e)
  }

  if (!event) {
    return res.status(404).json({ error: 'Event not found!' })
  }

  if (event.created_by !== authId) {
    return res.status(401).json({ error: 'Unauthorized!' })
  }

  const registrantsObjects = getAllRegistrantsIdsFromEvent(event)

  for (const index in registrantsObjects) {
    const registrantObject = registrantsObjects[index]
    const { _id, type } = registrantObject

    let user
    try {
      user = await Models.User.findById(_id)
    } catch (e) {
      console.error(e)
    }

    if (!user) continue

    const finalObject = {
      name: `${user.first_name} ${user.last_name[0].toUpperCase()}`,
      id: user._id,
      profile_image: user.profile_image,
      registration_type: type
    }

    results.push(finalObject)
  }

  return res.status(200).json({ results })
})

router.get('/hosted-events', async (req, res, next) => {
  const authId = res.locals.user

  let eventsIds
  const hostedEvents = []

  try {
    const query = await Models.User.findById(authId).select('hosted_events')
    eventsIds = (query || {}).hosted_events
  } catch (e) {
    return next(e)
  }

  if (!eventsIds) {
    return res.status(200).json({ hostedEvents: [] })
  }

  for (const eventId of eventsIds) {
    let event
    try {
      event = await Models.Event.findById(eventId)
    } catch (e) {
      console.error(e)
    }

    if (!event) continue

    let registrants_count = 0

    const registrantsCategories: Array<keyof IEvent> = [
      'users_attending', 'virtual_attending', 'pending_virtual', 'pending_inperson', 'rejected_virtual', 'rejected_inperson', 'pending_payment_virtual', 'pending_payment_inperson'
    ]

    for (const category of registrantsCategories) {
      if (Object.prototype.hasOwnProperty.call(event, category) && typeof event[category] === 'object') {
        registrants_count += Object.keys(event[category]).length
      }
    }

    let interested_count = 0
    if (event.interested) {
      interested_count = Object.keys(event.interested).length
    }

    // Get views
    let total_views = 0

    try {
      const analytics = await Models.EventAnalytics.findById(eventId, 'views')
      const { views } = analytics || {}
      if (views) {
        total_views = Object.values(views).reduce((a, b) => a + b, 0)
      }
    } catch (e) {
      console.error(e)
    }

    const publicEvent = {
      id: event._id,
      event_image: event.event_image,
      timestamp_start: event.timestamp_start,
      timestamp_end: event.timestamp_end,
      event_name: event.event_name,
      registrants_count,
      interested_count,
      total_views
    }

    hostedEvents.push(publicEvent)
  }

  return res.status(200).json({ hostedEvents })
})
router.get('/attendance-code/:id', async (req, res, next) => {
  const authId = res.locals.user
  const eventId = req.params.id
  try {
    const event = await Models.Event.findById(eventId)
    if (!event) {
      return res.status(404).json({ error: 'This event does not exist!' })
    }
    if (event.created_by !== authId) {
      return res.status(401).json({ error: 'You are not the host!' })
    }
    const attendance = await Models.EventAttendance.findById(eventId)
    const attendanceCode = (attendance || {}).code
    if (!attendanceCode) {
      return res.status(404).json({ error: 'This engagement does not have an attendance code!' })
    }
    return res.status(200).json({ code: attendanceCode })
  } catch (e) {
    return next(e)
  }
})
router.get('/registrants/:eventId', async (req, res, next) => {
  interface IRegistrant extends IPublicUser {
    reg_id: string
    req_id: string
    type: 'pending inperson' | 'pending virtual' | 'attending inperson' | 'attending virtual' | 'rejected' | 'waitlist virtual' | 'waitlist inperson'
  }

  type IWaitlistRegistrant = Pick<IEvent['waitlist'][0], 'uid' | 'queue_place' | 'timestamp'> & IRegistrant
  const { eventId } = req.params
  const authId = res.locals.user

  let event
  try {
    event = await Models.Event.findById(eventId)
    if (!event) {
      return res.status(404).json({ error: `Could not find the event with id: ${eventId}!` })
    }
  } catch (e) {
    return next(e)
  }
  const registrants: Array<IRegistrant> = []
  const waitlist: Array<IWaitlistRegistrant> = []
  const rawRegistrants = []
  if (event.pending_inperson) {
    for (const requestId in event.pending_inperson) {
      const userId = event.pending_inperson[requestId]
      const user: Pick<IRegistrant, 'reg_id' | 'req_id' | 'type'> = {
        reg_id: userId,
        req_id: requestId,
        type: 'pending inperson'
      }
      rawRegistrants.push(user)
    }
  }
  if (event.pending_virtual) {
    for (const requestId in event.pending_virtual) {
      const userId = event.pending_virtual[requestId]
      const user: Pick<IRegistrant, 'reg_id' | 'req_id' | 'type'> = {
        reg_id: userId,
        req_id: requestId,
        type: 'pending virtual'
      }
      rawRegistrants.push(user)
    }
  }
  if (event.users_attending) {
    for (const requestId in event.users_attending) {
      const userId = event.users_attending[requestId]
      const user: Pick<IRegistrant, 'reg_id' | 'req_id' | 'type'> = {
        reg_id: userId,
        req_id: requestId,
        type: 'attending inperson'
      }
      rawRegistrants.push(user)
    }
  }
  if (event.virtual_attending) {
    for (const requestId in event.virtual_attending) {
      const userId = event.virtual_attending[requestId]
      const user: Pick<IRegistrant, 'reg_id' | 'req_id' | 'type'> = {
        reg_id: userId,
        req_id: requestId,
        type: 'attending virtual'
      }
      rawRegistrants.push(user)
    }
  }
  if (event.rejected_virtual) {
    const store = event.rejected_virtual
    for (const id in store) {
      const user: Pick<IRegistrant, 'reg_id' | 'req_id' | 'type'> = {
        reg_id: store[id],
        req_id: id,
        type: 'rejected'
      }
      rawRegistrants.push(user)
    }
  }
  if (event.rejected_inperson) {
    const store = event.rejected_inperson
    for (const id in store) {
      const user: Pick<IRegistrant, 'reg_id' | 'req_id' | 'type'> = {
        reg_id: store[id],
        req_id: id,
        type: 'rejected'
      }
      rawRegistrants.push(user)
    }
  }
  if (event.waitlist) {
    for (const id in event.waitlist) {
      const request = event.waitlist[id]
      const user: Pick<IWaitlistRegistrant, 'reg_id' | 'req_id' | 'type' | 'uid' | 'queue_place' | 'timestamp'> = {
        reg_id: request.uid,
        req_id: id,
        type: `waitlist ${event.waitlist[id].type}` as 'waitlist virtual' | 'waitlist inperson',
        queue_place: request.queue_place,
        timestamp: request.timestamp,
        uid: request.uid
      }

      rawRegistrants.push(user)
    }
  }

  for (const i in rawRegistrants) {
    const defaultProps = rawRegistrants[i]
    const userId = defaultProps.reg_id
    try {
      const request = await generategetPublicUser(userId, authId)
      // If user not found it will throw an error
      if (defaultProps.type.includes('waitlist')) {
        const user = Object.assign(request, defaultProps) as IWaitlistRegistrant
        waitlist.push(user)
      } else {
        const user = Object.assign(request, defaultProps) as IRegistrant
        // Additional transformations
        registrants.push(user)
      }
    } catch (e) {
      console.log(`User with id ${userId} could not be fetched!`)
      console.error(e.message)
    }
  }

  return res.status(200).json({ registrants, waitlist })
})
router.get('/guests_filter_to_pdf/:event_name/:jsonData', async (req, res) => {
  try {
    const data = JSON.parse(req.params.jsonData)
    const fields = Object.keys(data[0])
    const { event_name } = req.params
    let keysArray = ''
    let guestsArray = ''
    fields.forEach(f => {
      keysArray += `<th>${f}</th>`
    })
    for (const row of data) {
      guestsArray += '<tr>'
      for (const f of fields) {
        guestsArray += `<td>${row[f]}</td>`
      }
      guestsArray += '</tr>'
    }
    /* HTML Page requires
    * @string keysArray
    * @string guestsArray
    * @event_name
    */
    const rawHtml = await fs.readFileSync('./components/templates/guestsFilter.html', 'utf8')
    // eslint-disable-next-line no-eval
    const html = eval(`\`${rawHtml}\``)
    convertHTMLToPDF.create(html, { format: 'A4' }).toStream((err, stream) => {
      if (err) { return res.status(500).json({ error: 'Could not convert to PDF' }) }
      res.setHeader('Content-Type', 'application/pdf')
      return stream.pipe(res)
    })
  } catch (e) {
    console.log(`Error: ${req.originalUrl} - ${new Date()}`)
    console.log(e)
    res.status(500).send()
  }
})
router.get('/clone/:id', async (req, res, next) => {
  try {
    const target = req.params.id
    const authId = res.locals.user
    const event = await Models.Event.findById(target).select('_id capacity event_image event_video attachments cause charity created_by timestamp_start timestamp_end event_description event_location_access string_address created_by event_name price private display_phone event_type host_contact registration_requisite requires_confirmation zoom_link string_location location_instructions registration_form registration_file')
    if (!event) {
      return res.status(404).json({ error: 'event not found' })
    }
    if (event.created_by !== authId) {
      return res.status(401).json({ error: 'unauthorized' })
    }

    let responseEvent
    if (event.tags) {
      const tagsObjects = []
      for (const i in event.tags) {
        const _id = event.tags[i]
        const tag = await Models.Tag.findById(_id).select('value')
        const { value } = tag || {}
        tagsObjects.push({ _id, value })
      }
      responseEvent = {
        ...event,
        tags: tagsObjects
      }
    } else {
      responseEvent = { ...event }
    }
    return res.status(200).json(responseEvent)
  } catch (e) {
    return next(e)
  }
})
router.get('/id/:id', async (req, res, next) => {
  try {
    const target = req.params.id
    const authId = res.locals.user
    const event = await Models.Event.findById(target).select('capacity event_image event_video attachments waitlist_enabled waitlist_auto cause charity created_by timestamp_start timestamp_end event_description event_location_access users_attending virtual_attending pending_virtual pending_inperson rejected_virtual rejected_inperson event_name price event_type host_contact private notifications id registration_requisite register_timestamps requires_confirmation registration_form registration_file registrants_files registrants_forms rated_guests zoom_link rated_by waitlist settings tags maps location_instructions display_phone string_address string_location earnings surveys')
    if (!event) {
      return res.status(404).json({ message: 'Not found' })
    }
    if (event.created_by !== authId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    let responseEvent = { ...event }

    const host = await Models.User.findById(authId)

    if (!host) {
      return res.status(404).json({ error: 'Host not found' })
    }

    const basicEventData = await generatePublicEvent(event, host, authId)

    responseEvent = { ...basicEventData, ...responseEvent }

    if (event.pending_payment_virtual) {
      responseEvent.pending_payment_virtual = {}
      for (const label in event.pending_payment_virtual) {
        responseEvent.pending_payment_virtual[label] = event.pending_payment_virtual[label]
      }
    }
    if (event.pending_payment_inperson) {
      responseEvent.pending_payment_inperson = {}
      for (const label in event.pending_payment_inperson) {
        responseEvent.pending_payment_inperson[label] = event.pending_payment_inperson[label]
      }
    }
    if (event.locations) {
      // Check for maps
      responseEvent.locations = {
        accepted: '',
        default: ''
      }
      responseEvent.locations.default = event.locations.default
      if (event.virtual_attending) {
        if (Object.values(event.virtual_attending).find(id => id === authId)) {
          responseEvent.locations.accepted = event.locations.accepted
        }
      }
      if (event.users_attending) {
        if (Object.values(event.users_attending).find(id => id === authId)) {
          responseEvent.locations.accepted = event.locations.accepted
        }
      }
    }
    const tagsObjects = []
    for (const tagId of event.tags) {
      const rawTag = await Models.Tag.findById(tagId)
      if (rawTag) {
        tagsObjects.push({ _id: tagId, value: rawTag.value })
      }
    }

    const finalResponse = {
      ...responseEvent,
      tags: tagsObjects
    }

    return res.status(200).json(finalResponse)
  } catch (e) {
    return next(e)
  }
})

interface IResponse {
  score: number
  occurrences: {
    [key: string]: number
  }
}
router.get('/requisite-files/filter/:event/:keywords', async (req, res, next) => {
  const uid = res.locals.user
  const target = req.params.event
  let keywords: Array<string> = []
  try {
    keywords = JSON.parse(req.params.keywords)
  } catch (e) {
    return next(e)
  }
  if ((keywords.length < 1) || (keywords.length > 10)) {
    return res.status(400).json({ error: `Expected min 1 keyword - max 10 keywords, got ${keywords.length}` })
  }
  const event = await Models.Event.findById(target)

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  if (event.created_by !== uid) {
    return res.status(401).json({ error: 'User is not the host' })
  }
  const { registrants_files } = event
  if (!registrants_files) {
    return res.status(200).json({})
  }
  const response: {
    [key: string]: IResponse
  } = {}
  // eslint-disable-next-line no-restricted-syntax
  for (const id in registrants_files) {
    const requisitePath = decodeURIComponent(registrants_files[id].replace('https://s3.amazonaws.com/cdn.sparc.world/', '').split('+').join(' '))
    const url = await cloudStorage.getSignedUrl('getObject', {
      Key: requisitePath,
      Expires: 20
    })
    const fileName = requisitePath.split('/')[requisitePath.split('/').length - 1]
    let content = ''
    if (url.toLowerCase().includes('.pdf')) {
      try {
        const dataBuffer = await getBufferFromUrl(url)
        content = (await pdf(dataBuffer)).text
      } catch (e) {
        global.log_err({ serverRequest: req, error: `Could not get text from PDF - Event ID: ${event._id}` })
      }
    } else {
      try {
        content = await getTextFromUrlDocument(url, fileName)
        console.log('Dev note: "Warning TT: undefined function: 32" =>  bad font recovery message')
      } catch (e) {
        global.log_err({ serverRequest: req, error: `Textract could not get the data from - Event ID: ${event._id}` })
      }
    }
    const data: IResponse = { score: 0, occurrences: {} }

    if (!content) {
      keywords.forEach(word => {
        const k = word.toLowerCase()
        data.occurrences[k] = 0
        data.score += 0
      })
    } else {
      content = content.toLowerCase()
      keywords.forEach(word => {
        const k = word.toLowerCase()
        const s = countOccurrencesInString(content, k)
        data.occurrences[k] = s
        data.score += s
      })
    }
    response[id] = data
  }
  return res.status(200).json(response)
})

router.use(searchKeywordsInRequisites)

export default router
