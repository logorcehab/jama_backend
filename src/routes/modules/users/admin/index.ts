import { Router } from 'express'
import generatePublicEvent from '../../../../libs/modules/events/generate-public-event'
import { User } from '../../../../models'
import { Event } from '../../../../models'

const Models = {
  User,
  Event
}

const router = Router()

router.get('/get/attended-events', async (req, res, next) => {
  const authId = req.user
  let user

  try {
    user = await Models.User.findById(authId)
  } catch (e) {
    return next(e)
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found!' })
  }

  const events = []
  if (!user.attended_events) {
    return res.status(200).json({ results: [] })
  }

  const attendedEventsIds = user.attended_events

  for (const eventId of attendedEventsIds) {
    try {
      const event = await Models.Event.findById(eventId)
      if (!event) continue

      const host = await Models.User.findById(event.created_by)
      if (!host) continue

      const result = await generatePublicEvent(event, host, user._id)

      events.push(result)
    } catch (e) {
      console.error(e)
    }
  }

  return res.status(200).json({ results: events })
})

router.get('/get/hosted-events', async (req, res, next) => {
  const authId = req.user
  let user
  try {
    user = await Models.User.findById(authId)
  } catch (e) {
    return next(e)
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found!' })
  }

  const events = []
  if (!user.hosted_events) {
    return res.status(200).json({ results: [] })
  }

  const hostedEventsIds = Object.values(user.hosted_events)

  for (const eventId of hostedEventsIds) {
    try {
      const event = await Models.Event.findById(eventId)
      if (!event) continue

      const result = await generatePublicEvent(event, user, user._id)

      events.push(result)
    } catch (e) {
      console.error(e)
    }
  }

  return res.status(200).json({ results: events })
})

export default router
