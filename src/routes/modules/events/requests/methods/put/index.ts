import { Router } from 'express'
// Models
import { Event, User } from '@florinrelea/sparc-shared/models'
import { IEvent } from '@florinrelea/sparc-shared/@types/models/event/Event'
import { scheduleNotification } from '@florinrelea/sparc-shared/libs/modules/worker'

const Models = {
  Event,
  User
}

const router = Router()

router.put('/reject', async (req, res, next) => {
  try {
    const uid = res.locals.user
    // Validation
    if (!req.body || !req.body.event || !req.body.request || !req.query.label) {
      const e = 'Wrong Body'
      console.log(e)
      return res.status(400).json({ error: e })
    }
    let label = 'waitlist'
    if (req.query.label === 'waitlist' || req.query.label === 'pending') {
      label = req.query.label
    } else {
      const e = `Invalid request label - ${req.query.label}`
      console.log(e)
      return res.status(400).json({ error: e })
    }

    const target = {
      event: req.body.event,
      request: req.body.request,
      label
    }
    const event = await Models.Event.findById(target.event)
    if (!event) {
      const e = 'Event not found'
      return res.status(404).json({ error: e })
    }
    // Verify authorization
    if (event.created_by !== uid) {
      const e = 'You are not the host'
      console.log(e)
      return res.status(401).json({ error: e })
    }
    if (event.timestamp_end <= Date.now()) {
      const e = 'This event has passed!'
      console.log(e)
      return res.status(401).json({ error: e })
    }
    let requestUser
    let p = {
      user: '',
      type: ''
    }
    let oldLabel = 'waitlist'
    if (target.label === 'pending') {
      if (event.pending_virtual && event.pending_virtual[target.request]) {
        requestUser = event.pending_virtual[target.request]
        p = {
          user: requestUser,
          type: 'virtual'
        }
        oldLabel = 'pending_virtual'
      } else if (event.pending_inperson && event.pending_inperson[target.request]) {
        requestUser = event.pending_inperson[target.request]
        p = {
          user: requestUser,
          type: 'inperson'
        }
        oldLabel = 'pending_inperson'
      }
    } else if (target.label === 'waitlist') {
      requestUser = event[target.label][target.request]
      p = {
        user: requestUser.uid,
        type: requestUser.type
      }
    }
    if (!requestUser) {
      const e = 'Request not found'
      return res.status(404).json({ error: e })
    }
    // Put data in the database
    await Models.Event.findByIdAndUpdate(target.event, {
      $set: {
        [`rejected_${p.type}.${target.request}`]: p.user
      }
    })
    await Models.Event.findByIdAndUpdate(target.event, {
      $unset: {
        [`${oldLabel}.${target.request}`]: 1
      }
    })

    const notificationData = {
      event: target.event,
      request: target.request
    }
    // Set Notifications
    await scheduleNotification.events.guest.rejectedRequest(notificationData)
    return res.status(200).send()
  } catch (e) {
    return next(e)
  }
})
router.put('/accept', async (req, res, next) => {
  try {
    const uid = res.locals.user
    // Validation
    if (!req.body || !req.body.event || !req.body.request || !req.query.label) {
      const e = 'Wrong Body'
      console.log(e)
      return res.status(400).json({ error: e })
    }
    let label = 'waitlist'
    let oldLabel = ''
    if (req.query.label === 'waitlist' || req.query.label === 'pending') {
      label = req.query.label
    } else {
      const e = `Invalid request label - ${req.query.label}`
      console.log(e)
      return res.status(400).json({ error: e })
    }

    const target = {
      event: req.body.event,
      request: req.body.request,
      label
    }
    const event = await Models.Event.findById(target.event)
    if (!event) {
      const e = 'Event not found'
      console.log(e)
      return res.status(404).json({ error: e })
    }
    // Verify authorization
    if (event.created_by !== uid) {
      const e = 'You are not the host'
      console.log(e)
      return res.status(401).json({ error: e })
    }
    if (event.timestamp_end <= Date.now()) {
      const e = 'This event has passed!'
      console.log(e)
      return res.status(401).json({ error: e })
    }
    let request: {
      type?: 'virtual' | 'inperson'
      uid: string
    } = {
      uid: ''
    }
    if (target.label === 'pending') {
      if (event.pending_virtual && event.pending_virtual[target.request]) {
        request = {
          type: 'virtual',
          uid: event.pending_virtual[target.request]
        }
        oldLabel = 'pending_virtual'
      } else if (event.pending_inperson && event.pending_inperson[target.request]) {
        request = {
          type: 'virtual',
          uid: event.pending_inperson[target.request]
        }
        oldLabel = 'pending_inperson'
      }
    } else if (target.label === 'waitlist') {
      const requestObject = event[target.label][target.request]
      request = {
        type: requestObject.type === 'virtual' ? 'virtual' : 'inperson',
        uid: requestObject.uid
      }
    }
    if (!request.type) {
      return res.status(404).json({ error: 'Request not found' })
    }
    const attendingType = request.type === 'virtual' ? 'virtual_attending' : 'users_attending'
    const capacity = event.capacity[request.type] as number
    const participants = event[attendingType] ? Object.keys(event[attendingType]).length : 0
    if (capacity <= participants) {
      const e = 'No spots left'
      console.log(e)
      return res.status(401).json({ error: e })
    }
    // Fetch data in the database
    const finalLabel = request.type === 'virtual' ? 'virtual_attending' : 'users_attending'
    await Models.Event.findByIdAndUpdate(target.event, {
      $set: {
        [`${finalLabel}.${target.request}`]: request.uid
      }
    })
    await Models.Event.findByIdAndUpdate(target.event, {
      $unset: {
        [`${oldLabel}.${target.request}`]: 1
      }
    })
    await Models.Event.findByIdAndUpdate(request.uid, {
      $push: {
        attended_events: target.event
      },
      $inc: {
        number_of_attended_events: 1
      },
      last_event_attended: target.event
    })
    const o = {
      event: target.event,
      request: target.request
    }
    // Set notifications
    await scheduleNotification.events.guest.acceptedRequest(o)

    return res.status(200).send()
  } catch (e) {
    return next(e)
  }
})
router.put('/waitlist', async (req, res, next) => {
  try {
    // Validation
    if (!req.body || !req.body.event || !req.body.request) {
      const e = 'Wrong Body'
      console.log(e)
      return res.status(400).json({ error: e })
    }
    const uid = res.locals.user
    const target = {
      event: req.body.event,
      id: req.body.request,
      timestamp: Date.now()
    }
    const event = await Models.Event.findById(target.event)
    if (!event) {
      const e = 'Event not found!'
      console.log(e)
      return res.status(401).json({ error: e })
    }
    // Verify authorization
    if (event.created_by !== uid) {
      const e = 'You are not the host'
      console.log(e)
      return res.status(401).json({ error: e })
    }
    if (event.timestamp_end < Date.now()) {
      const e = 'Event has passed'
      console.log(e)
      return res.status(403).json({ error: e })
    }
    if (!event.waitlist_enabled) {
      const e = 'Waitlist feature not enabled'
      console.log(e)
      return res.status(403).json({ error: e })
    }
    let label
    const types: (keyof IEvent)[] = ['pending_virtual', 'pending_inperson', 'users_attending', 'virtual_attending']
    for (const t of types) {
      if (event[t] && event[t][target.id]) {
        label = t
      }
    }
    if (!label) {
      const e = 'Request not found'
      console.log(e)
      return res.status(404).json({ error: e })
    }
    const c = label.includes('virtual') ? 'waitlist_virtual' : 'waitlist_inperson'
    if (event.waitlist && (event.capacity[c] as number <= Object.keys(event.waitlist).length)) {
      const e = 'No spots available'
      console.log(e)
      return res.status(403).json({ error: e })
    }
    // Prepare to move the request
    const requestUser = event[label][target.id]
    const reqType = (label.includes('inperson') || label.includes('users')) ? 'inperson' : 'virtual'
    // Get request queue place
    let queue_place = 1
    if (event.waitlist) {
      const count = Object.keys(event.waitlist).length
      queue_place = count + 1
    }
    const newRequest = {
      queue_place,
      uid: requestUser,
      type: reqType,
      timestamp: target.timestamp
    }
    await Models.Event.findByIdAndUpdate(target.event, {
      $unset: {
        [`${label}.${target.id}`]: 1
      }
    })
    await Models.Event.findByIdAndUpdate(target.event, {
      $set: {
        [`waitlist.${target.id}`]: newRequest
      }
    })
    // Set notification
    const log = {
      event_id: target.event,
      request_id: target.id
    }
    await scheduleNotification.events.guest.waitlistedRequest(log)
    return res.status(200).send()
  } catch (e) {
    return next(e)
  }
})

export default router
