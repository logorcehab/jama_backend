import { Router } from 'express'
import deleteRoute from './delete'
import putRoute from './put'

import { User } from '../../../../models'

const Models = {
  User
}

const router = Router()

// Change architecture

router.use('/delete', deleteRoute)
router.use('/put', putRoute)

router.get('/notifications', async (req, res, next) => {
  const authId = req.user

  let eventsRecommendations = {}

  try {
    const userDocument = await Models.User.findById(authId, 'notifications_settings') || { notifications_settings: { events_recommendations: true } }
    eventsRecommendations = userDocument.notifications_settings.events_recommendations
  } catch (e) {
    return next(e)
  }

  return res.status(200).json({ eventsRecommendations })
})
router.patch('/notifications/events-recommendations/:status', async (req, res, next) => {
  const authId = req.user
  const status = req.params.status === 'true'

  try {
    await Models.User.findByIdAndUpdate(authId, {
      $set: {
        'notifications_settings.events_recommendations': status
      }
    })
  } catch (e) {
    return next(e)
  }

  return res.status(200).send()
})

router.patch('/prop/:prop/:status', async (req, res, next) => {
  const props = ['profile_private', 'disabled_share', 'disabled_messages', 'followers_notifs', 'show_followers', 'show_followed']
  const { prop } = req.params
  const status = req.params.status === 'true'
  if (!props.includes(prop)) {
    return res.status(400).json({ error: `Invalid property: ${prop}` })
  }
  const uid = req.user
  try {
    if (prop === 'followers_notifs') {
      await Models.User.findByIdAndUpdate(uid, {
        $set: {
          [prop]: status
        }
      })
    } else {
      await Models.User.findByIdAndUpdate(uid, {
        $set: {
          [`control_panel.${prop}`]: status
        }
      })
    }
  } catch (e) {
    return next(e)
  }

  return res.status(200).send()
})

export default router
