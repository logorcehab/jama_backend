import { Router } from 'express'
import Validator from 'validatorjs'
import { Tag, Event, User } from '@florinrelea/sparc-shared/models'

import { IEvent } from '@florinrelea/sparc-shared/@types/models/event/Event'
import { scheduleNotification } from '@florinrelea/sparc-shared/libs/modules/worker'

const Models = {
  Event,
  User,
  Tag
}

const router = Router()

router.patch('/:eventId/:prop/:propValue', async (req, res, next) => {
  const authId = res.locals.user
  const { prop, eventId, propValue } = req.params

  const allowedProps: (keyof IEvent)[] = [
    'waitlist_enabled',
    'display_phone',
    'requires_confirmation'
  ]

  if (!allowedProps.includes(prop as keyof IEvent)) {
    return res.status(400).json({ error: `Invalid property: ${prop}` })
  }

  try {
    const event = await Models.Event.findById(eventId)

    if (!event) {
      return res.status(404).json({ error: 'No event found!' })
    }

    if (event.created_by !== authId) {
      return res.status(401).json({ error: 'Unauthorized!' })
    }

    let finalValue = null
    if (prop === 'waitlist_enabled' || prop === 'display_phone' || prop === 'requires_confirmation') finalValue = propValue === 'true'

    await Models.Event.findByIdAndUpdate(eventId, {
      [prop]: finalValue
    })
  } catch (e) {
    return next(e)
  }

  return res.status(200).send()
})
router.patch('/date/:eventId', async (req, res, next) => {
  const authId = res.locals.user
  const { eventId } = req.params
  const b = req.body
  if (!b) {
    return res.status(400).json({ error: 'Expected payload!' })
  }

  let event = null
  let { timestamp_start, timestamp_end } = (b || {})
  const { message } = (b || {})

  try {
    event = await Models.Event.findById(eventId)

    if (!event) {
      return res.status(404).json({ error: 'No event found!' })
    }

    if (event.created_by !== authId) {
      return res.status(401).json({ error: 'Unauthorized!' })
    }

    // Validate event
    if (Date.now() + 86400000 >= event.timestamp_start) {
      return res.status(401).json({ error: 'You cannot change the engagement date one day before!' })
    }

    // Validate payload

    if (!timestamp_start || !timestamp_end) {
      return res.status(400).json({ error: 'Expected timestamp start and timestamp end!' })
    }

    timestamp_start = parseInt(timestamp_start, 10)
    timestamp_end = parseInt(timestamp_end, 10)

    if (timestamp_start <= Date.now()) {
      return res.status(400).json({ error: 'The start time should be later then now!' })
    }

    if (timestamp_start >= timestamp_end) {
      return res.status(400).json({ error: 'The engagement duration is 0!' })
    }

    const updatePayload = {
      timestamp_start,
      timestamp_end
    }
    await Models.Event.findByIdAndUpdate(eventId, updatePayload)
  } catch (e) {
    return next(e)
  }

  // Notification
  try {
    await scheduleNotification.events.guest.dateChanged({
      id: event._id,
      message
    })
  } catch (e) {
    return res.status(500).json({ error: 'The engagement time has been changed but we could not notify your attendees.' })
  }

  return res.status(200).send()
})

router.patch('/details/:eventId', async (req, res, next) => {
  const authId = res.locals.user
  const { eventId } = req.params
  const b = req.body
  if (!b || !b.event_name) {
    return res.status(400).json({ error: 'Wrong request!' })
  }

  const payload = {
    event_name: String(b.event_name),
    event_description: String(b.event_description),
    waitlist_enabled: b.waitlist_enabled === true,
    requires_confirmation: b.requires_confirmation === true,
    display_phone: b.display_phone === true,
    host_contact: String(b.host_contact || ''),
    zoom_link: String(b.zoom_link),
    location_instructions: {
      virtual: b.location_instructions ? String(b.location_instructions.virtual) : undefined
    },
    tags: b.tags as string[]
  }
  // Validate
  const rules = {
    event_name: 'required|string|min:3|max:200',
    event_description: 'string|min:3|max:1100',
    waitlist_enabled: 'required|boolean',
    display_phone: 'required|boolean',
    host_contact: payload.host_contact ? 'required|string|min:1|max:1000' : '',
    zoom_link: payload.zoom_link ? 'required|string|min:1|max:1000' : '',
    location_instructions: {
      virtual: payload.location_instructions.virtual ? 'required|string|min:1|max:2000' : ''
    },
    tags: 'array|min:1|max:100'
  }

  const validator = new Validator(payload, rules)
  if (validator.fails()) {
    return res.status(400).json({ error: validator.errors.all() })
  }

  payload.event_name = payload.event_name.replace(/^\s+/mg, '')

  // Validate every tag
  async function validateTagsArray(tagsArray: string[] = []) {
    const tagsQueue = []
    for (const tagId of tagsArray) {
      const task = Models.Tag.findById(tagId)
      tagsQueue.push(task)
    }

    const results = await Promise.all(tagsQueue)
    // Check if any tag is wrong
    const hasInvalidTag = results.find(result => result == null)
    return !hasInvalidTag
  }

  const hasValidTags = await validateTagsArray(payload.tags)

  if (!hasValidTags) {
    return res.status(400).json({ error: 'One or more tags are invalid!' })
  }

  let event
  try {
    event = await Models.Event.findById(eventId)
  } catch (e) {
    return next(e)
  }
  if (!event) {
    return res.status(404).json({ error: 'Event not found!' })
  }
  if (event.created_by !== authId) {
    return res.status(401).json({ error: 'You are not the host!' })
  }

  // If event passed
  if (Date.now() > event.timestamp_start) {
    return res.status(401).json({ error: 'You cannot make changes if the engagement passed!' })
  }

  try {
    await Models.Event.findByIdAndUpdate(eventId, payload)
  } catch (e) {
    return next(e)
  }
  return res.status(200).send()
})
router.patch('/displayed_components/:prop', async (req, res, next) => {
  try {
    const authId = res.locals.user
    // Validation
    if (!req.body || !req.body.id || (typeof req.body.status === 'undefined')) {
      return res.status(400).json({ error: 'Wrong request!' })
    }
    const property = req.params.prop
    const eventId = req.body.id
    const status = req.body.status === true
    const validProperties = ['make_offer', 'message_host']
    if (!validProperties.includes(property)) {
      return res.status(400).json({ error: `Unexpected property: ${property}` })
    }
    const userData = await Models.Event.findById(eventId, 'created_by')
    const event_created_by = (userData || {}).created_by
    if (event_created_by !== authId) {
      return res.status(401).json({ error: 'You are not the host!' })
    }
    await Models.Event.findByIdAndUpdate(eventId, {
      $set: {
        [`settings.displayed_components.${property}`]: status
      }
    })
    return res.status(200).send()
  } catch (e) {
    return next(e)
  }
})
router.patch('/toggleprivate', async (req, res, next) => {
  const authId = res.locals.user
  const b = req.body
  if (!b || !b.id || typeof b.state === 'undefined') {
    return res.status(400).json({ error: 'Wrong request!' })
  }
  const target = b.id
  const state = b.state === true
  try {
    const event = await Models.Event.findById(target)
    if (!event) {
      return res.status(404).json({ error: 'Event not found!' })
    }

    if (event.created_by !== authId) {
      return res.status(401).json({ error: 'Unauthorized!' })
    }
    await Models.Event.findByIdAndUpdate(target, {
      private: state
    })
  } catch (e) {
    return next(e)
  }

  return res.status(200).send()
})
router.patch('/togglenotifications', async (req, res, next) => {
  if (!req.body.id || (typeof req.body.state === 'undefined')) {
    return res.status(400).json({ error: 'Wrong request!' })
  }
  const target = req.body.id
  let state = false
  if ((req.body.state === true) || (req.body.state === 'true')) {
    state = true
  }
  const authId = res.locals.user
  try {
    const event = await Models.Event.findById(target)
    if (!event) {
      return res.status(404).json({ error: 'Engagement not found!' })
    }
    if (event.created_by !== authId) {
      return res.status(401).json({ error: 'Unauthorized!' })
    }
    await Models.Event.findByIdAndUpdate(target, {
      notifications: state
    })

    return res.status(200).json({ status: 'success' })
  } catch (e) {
    return next(e)
  }
})

export default router
