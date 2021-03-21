import { Router } from 'express'
import authentification from '../../../../middlewares/authentification'
import { addWaitlistWatcher, removeWaitlistWatcher } from '@florinrelea/sparc-shared/libs/modules/worker'
import { Event, User } from '@florinrelea/sparc-shared/models'

const Models = {
  Event,
  User
}

const router = Router()

router.use(authentification)

router.put('/movedown', async (req, res, next) => {
  try {
    const uid = res.locals.user
    // Validation
    if (!req.body || !req.body.event || !req.body.request) {
      const e = 'Wrong Body'
      console.log(e)
      return res.status(400).json({ error: e })
    }
    const target = {
      event: req.body.event,
      request: req.body.request
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
      const e = 'This event has passed'
      console.log(e)
      return res.status(401).json({ error: e })
    }
    const request = event.waitlist[target.request]
    if (!request) {
      const e = 'Request not found'
      console.log(e)
      return res.status(404).json({ error: e })
    }
    const c = request.type === 'virtual' ? 'waitlist_virtual' : 'waitlist_inperson'
    const capacityOfType = Number(event.capacity[c])
    if (request.queue_place >= capacityOfType) {
      const e = 'This request is already the last one in the queue'
      console.log(e)
      return res.status(401).json({ error: e })
    }
    // Fetch data in the database
    const finalPos = request.queue_place + 1
    const list = event.waitlist
    const eventData = await Models.Event.findById(target.event, 'waitlist')
    const dbw = eventData?.waitlist || {}

    for (const requestId in list) {
      const guest = list[requestId]
      if (guest.queue_place === finalPos) {
        const pos = guest.queue_place - 1
        await Models.Event.findByIdAndUpdate(event._id, {
          $set: {
            [`waitlist.${requestId}.queue_place`]: pos
          }
        })
        break
      }
    }

    await Models.Event.findByIdAndUpdate(event._id, {
      $set: {
        [`waitlist.${target.request}.queue_place`]: finalPos
      }
    })
    return res.status(200).send()
  } catch (e) {
    return next(e)
  }
})
router.put('/moveup', async (req, res, next) => {
  try {
    const uid = res.locals.user
    // Validation
    if (!req.body || !req.body.event || !req.body.request) {
      const e = 'Wrong Body'
      console.log(e)
      return res.status(400).json({ error: e })
    }
    const target = {
      event: req.body.event,
      request: req.body.request
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
    const request = event.waitlist[target.request]
    if (!request) {
      const e = 'Request not found'
      console.log(e)
      return res.status(404).json({ error: e })
    }
    if (request.queue_place <= 1) {
      const e = 'This request is already first in the queue'
      console.log(e)
      return res.status(401).json({ error: e })
    }
    // Fetch data in the database
    const finalPos = request.queue_place - 1
    const list = event.waitlist
    const eventData = await Models.Event.findById(target.event, 'waitlist')
    const dbw = eventData?.waitlist || {}
    for (const i in list) {
      const guest = list[i]
      if (guest.queue_place === finalPos) {
        const pos = guest.queue_place + 1
        await Models.Event.findByIdAndUpdate(event._id, {
          $set: {
            [`waitlist.${i}.queue_place`]: pos
          }
        })
        break
      }
    }
    await Models.Event.findByIdAndUpdate(event._id, {
      $set: {
        [`waitlist.${target.request}.queue_place`]: finalPos
      }
    })
    return res.status(200).send()
  } catch (e) {
    return next(e)
  }
})
router.put('/toggleauto', async (req, res, next) => {
  try {
    // Validation
    if (!req.body || !req.body.event || (typeof req.body.status === 'undefined')) {
      const e = 'Wrong Body'
      console.log(e)
      return res.status(400).json({ error: e })
    }
    const uid = res.locals.user
    const targetEv = req.body.event
    const status = req.body.status === true
    const event = await Models.Event.findById(targetEv)
    if (!event) {
      const e = 'Event not found!'
      console.log(e)
      return res.status(404).json({ error: e })
    }
    // Verify authorization
    if (event.created_by !== uid) {
      const e = 'You are not the host'
      console.log(e)
      return res.status(401).json({ error: e })
    }
    if (event.waitlist_enabled !== true) {
      const e = 'This event does not have the waitlist feature enabled'
      console.log(e)
      return res.status(401).json({ error: e })
    }
    await Models.Event.findByIdAndUpdate(targetEv, {
      waitlist_auto: status
    })

    // Trigger server checker
    if (status === true) {
      await addWaitlistWatcher(targetEv)
    } else {
      await removeWaitlistWatcher(targetEv)
    }
    return res.status(200).send()
  } catch (e) {
    return next(e)
  }
})

export default router
