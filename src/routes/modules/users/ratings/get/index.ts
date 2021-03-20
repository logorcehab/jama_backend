import { Router } from 'express'
import { User, Event } from '../../../../../models'

const Models = {
  User,
  Event
}
const router = Router()

router.get('/id/:id', async (req, res, next) => {
  try {
    const target = req.params.id
    const userDocument = await Models.User.findById(target, '_id host_rating')
    if (!userDocument) {
      return res.status(404).json({ error: 'User not found!' })
    }
    const hostRating = userDocument.host_rating
    return res.status(200).json(hostRating)
  } catch (e) {
    return next(e)
  }
})


export default router
