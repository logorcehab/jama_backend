import { Router } from 'express'

// Models
import { User } from '../../../models'


// Routes
import messages from './messages'
import ratings from './ratings'
import query from './query'
import profile from './profile'
import interests from './interests'
import get from './get'
import events from './events'
import follow from './follow'
import billings from './billings'
import admin from './admin'
import earnings from './earnings'
// import calendar from './calendar'

const Models = {
  User
}
const router = Router()

// router.use('/calendar', calendar)

// Requires auth


router.use('/messages', messages)
router.use('/ratings', ratings)
router.use('/query', query)
router.use('/profile', profile)
router.use('/interests', interests)
router.use('/get', get)
router.use('/get', events)
router.use('/follow', follow)
router.use('/billings', billings)
router.use('/admin', admin)
router.use('/earnings', earnings)

router.get('/tooltip/:userId', async (req, res, next) => {
  const { userId } = req.params

  let user
  try {
    user = await Models.User.findOne({
      _id: userId,
      $ne: {
        'control_panel.profile_private': true
      }
    })
  } catch (e) {
    return next(e)
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found!' })
  }

  const responseUser = {
    id: user._id,
    profile_image: user.profile_image,
    name: `${user.first_name} ${user.last_name[0].toUpperCase()}.`,
    rating: user.host_rating.final_rate,
    headline: user.headline || null,
    current_city: user.additional_info && user.current_city
      ? user.current_city : null,
    control_panel: user.control_panel ? user.control_panel : {}
  }

  return res.status(200).json({ user: responseUser })
})

export default router
