import { Router } from 'express'
import generatePublicEvent from '../../../../libs/modules/events/generate-public-event'
import { User, Event } from '../../../../models'

const Models = {
  User,
  Event
}

const router = Router()

router.get('/attended-events', async (req, res, next) => {
  const authId = req.user
  let attendedEventsIds = []
  const q = req.query
  const filterByTime = q.time
  let userDocument
  try {
    userDocument = await Models.User.findById(authId, '_id attended_events')
    attendedEventsIds = userDocument?.attended_events || []

    if (attendedEventsIds.length === 0) {
      return res.status(200).json([])
    }
  } catch (e) {
    return next(e)
  }

  const results = []
  for (const eventId of attendedEventsIds) {
    try {
      const event = await Models.Event.findById(eventId)
      if (!event) continue

      if (filterByTime) {
        if (filterByTime === 'upcoming' && event.timestamp_end < Date.now()) {
          continue
        } else if (filterByTime === 'passed' && event.timestamp_end >= Date.now()) {
          continue
        }
      }

      const host = await Models.User.findById(event.created_by)
      if (!host) continue

      const result = await generatePublicEvent(event, host, userDocument._id)

      results.push(result)
    } catch (e) {
      console.error(e)
    }
  }

  return res.status(200).json(results)
})
router.get('/hosted-events/:id', async (req, res, next) => {
  const userId = req.params.id
  const authId = req.user
  let user
  let auth
  const results = []

  try {
    auth = await Models.User.findById(authId)
  } catch (e) {
    return next(e)
  }

  try {
    user = await Models.User.findById(userId)
  } catch (e) {
    return next(e)
  }
  if (!auth) {
    return res.status(404).json({ error: 'Auth user not found!' })
  }
  if (!user) {
    return res.status(404).json({ error: 'User not found!' })
  }

  const hostedEvents = user.hosted_events || []

  if (hostedEvents.length === 0) {
    return res.status(200).json([])
  }

  for (const eventId of hostedEvents) {
    const event = await Models.Event.findOne({
      _id: eventId,
      private: {
        $ne: true
      }
    })
    if (!event) continue

    const finalEvent = await generatePublicEvent(event, user, auth._id)
    results.push(finalEvent)
  }

  return res.status(200).json(results)
})

export default router
