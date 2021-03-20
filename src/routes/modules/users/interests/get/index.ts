import { Router } from 'express'
import { Event, User, UserInterests } from '../../../../../models'

import { IUser } from '../../../../../models/user/User'
import { IEvent } from '../../../../../models/event/Event'

const Models = {
  Event,
  User,
  UserInterests
}

const router = Router()

router.get('/me/all', async (req, res, next) => {
  try {
    const authId = req.user
    const interestsDocument = await Models.UserInterests.findById(authId)
    const allInterests = interestsDocument?.interests
    const interests: {
      event: Pick<IEvent, '_id' | 'event_name' | 'event_image'>
      host: Pick<IUser, 'first_name' | 'last_name' | 'last_name' | '_id' | 'profile_image'>
      interested_timestamp: number
    }[] = []
    if (!allInterests) {
      return res.status(200).json({ interests: [] })
    }
    for (const interestObject of allInterests) {
      const eventId = interestObject._id
      const interestedTimestamp = interestObject.timestamp
      const event = await Models.Event.findById(eventId)
      if (!event) {
        continue
      }
      const host = await Models.User.findById(event.created_by)
      if (!host) continue

      const finalCollection = {
        event: {
          _id: event._id,
          event_name: event.event_name,
          event_image: event.event_image
        },
        host: {
          _id: host._id,
          first_name: host.first_name,
          last_name: host.last_name,
          profile_image: host.profile_image
        },
        interested_timestamp: interestedTimestamp
      }
      interests.push(finalCollection)
    }
    return res.status(200).json({ interests })
  } catch (e) {
    return next(e)
  }
})
router.get('/check-event/:id', async (req, res, next) => {
  try {
    const authId = req.user
    const eventId = req.params.id
    // Check if already interested
    const interestsDocument = await Models.UserInterests.findById(authId)
    const interests = interestsDocument?.interests || []
    const verify = interests.map(el => el._id).includes(eventId)
    let interested = false
    if (verify) {
      interested = true
    }
    return res.status(200).json({ interested })
  } catch (e) {
    return next(e)
  }
})

export default router
