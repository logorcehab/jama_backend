import { Router } from 'express'
import { Event, UserInterests } from '../../../../../models'


const Models = {
  Event,
  UserInterests
}

const router = Router()

router.post('/add', async (req, res, next) => {
  try {
    const authId = req.user
    const b = req.body
    if (!b || !b.event) {
      return res.status(400).json({ error: 'Wrong request!' })
    }
    const eventId = b.event
    // Check if already interested
    const eventExists = await Models.Event.exists({ _id: eventId })
    const interestsDocument = await Models.UserInterests.findById(authId)
    const interests = interestsDocument?.interests || []
    const verify = interests.includes(eventId)
    if (!eventExists) {
      return res.status(401).json({
        error: 'This event does not exist!'
      })
    }
    if (verify) {
      return res.status(401).json({
        error: 'You are already interested of this event!'
      })
    }

    const timestamp = Date.now()

    await Models.UserInterests.findByIdAndUpdate(authId, {
      $push: {
        interest: {
          _id: eventId,
          timestamp
        }
      }
    })

    await Models.Event.findByIdAndUpdate(eventId, {
      $set: {
        [`interested.${authId}`]: timestamp
      }
    })
  } catch (e) {
    return next(e)
  }
  return res.status(200).send()
})

export default router
