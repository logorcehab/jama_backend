import { Router } from 'express'
import { Event, User, UserRating } from '@florinrelea/sparc-shared/models'

import { IUserRating } from '@florinrelea/sparc-shared/@types/models/user/Ratings'
import { IUser } from '@florinrelea/sparc-shared/@types/models/user/User'
import authentification from '../../../../../../middlewares/authentification'

const Models = {
  Event,
  User,
  UserRating
}

const router = Router()

router.use(authentification)

router.get('/id/:id', async (req, res, next) => {
  try {
    const target = req.params.id
    const event = await Models.Event.findById(target)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }
    const userDocument = await Models.UserRating.findById(event.created_by, 'host')
    const userHostRatings = (userDocument ? userDocument.toObject() : {}).host
    if (!userHostRatings) {
      return res.status(200).json({ ratings: [] })
    }

    const ratings: Array<
      IUserRating['host'][0]
      & {
        author?: Partial<IUser>
      }
    > = userHostRatings.filter(rating => rating.event_id === event._id)
    if (ratings.length === 0) {
      return res.status(200).json({ ratings: [] })
    }
    for (const id in ratings) {
      const rating = ratings[id]

      // Temporary fix
      if (rating.comment === 'No comment :(') rating.comment = ''

      const author = await Models.User.findById(rating.from_user_id, '_id profile_image first_name last_name host_rating')

      if (!author) {
        ratings.splice(Number(id), 1)
        continue
      }
      ratings[id].author = author.toObject()
    }

    return res.status(200).json({ ratings })
  } catch (e) {
    return next(e)
  }
})

export default router
