import { Router } from 'express'
import { User } from '@florinrelea/sparc-shared/models'
import { Event } from '@florinrelea/sparc-shared/models'

const Models = {
  User,
  Event
}

const router = Router()

router.get('/get/users-interested/:id', async (req, res, next) => {
  try {
    const eventId = req.params.id
    const authId = res.locals.user
    const event = await Models.Event.findById(eventId)
    if (!event) {
      return res.status(404).json({ error: 'Event not found!' })
    }
    if (event.created_by !== authId) {
      return res.status(401).json({ error: 'You are not the host!' })
    }
    const interested = []
    if (!Object.prototype.hasOwnProperty.call(event, 'interested')) {
      return res.status(200).json({ results: [] })
    }
    for (const userId in event.interested) {
      const interested_timestamp = event.interested[userId]
      const user = await Models.User.findById(userId)
      if (!user) continue
      const payload = {
        interested_timestamp,
        first_name: user.first_name,
        last_name: user.last_name,
        id: user._id,
        profile_image: user.profile_image
      }
      interested.push(payload)
    }
    return res.status(200).json({ results: interested })
  } catch (e) {
    return next(e)
  }
})

export default router
