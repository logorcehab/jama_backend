import { Router } from 'express'
import { Event, UserInterests } from '../../../../../models'

const Models = {
  Event,
  UserInterests
}

const router = Router()

router.delete('/:id', async (req, res, next) => {
  try {
    const authId = req.user
    const eventId = req.params.id
    const eventExists = await Models.Event.findById(eventId)
    if (!eventExists) {
      return res.status(401).json({
        error: 'This event does not exist!'
      })
    }
    await Models.UserInterests.findByIdAndUpdate(authId, {
      $pull: {
        interests: {
          _id: eventId
        }
      }
    })
    await Models.Event.findByIdAndUpdate(eventId, {
      $unset: {
        [`interested.${authId}`]: 1
      }
    })
  } catch (e) {
    return next(e)
  }
  return res.status(200).send()
})

export default router
