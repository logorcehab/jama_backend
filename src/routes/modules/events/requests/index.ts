import { Router } from 'express'
import authentification from '../../../../middlewares/authentification'
import getAuthUserRequestStatus from '../../../../libs/functions/events/get-auth-user-request-status'
// Routes
import putRoute from './methods/put'
import postRoute from './methods/post'
import deleteRoute from './methods/delete'
import patchRoute from './methods/patch'
import payment from './payment'
// Models
import { Event } from '@florinrelea/sparc-shared/models'
import { User } from '@florinrelea/sparc-shared/models'

const Models = {
  Event,
  User
}

const router = Router()

router.use(authentification)

router.use('/put', putRoute)
router.use('/post', postRoute)
router.use('/delete', deleteRoute)
router.use('/patch', patchRoute)
router.use('/payment', payment)

router.get('/get/me/:eventId', async (req, res, next) => {
  const authId = res.locals.user
  const { eventId } = req.params

  try {
    const event = await Models.Event.findById(eventId)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }
    const host = await Models.User.findById(event.created_by)
    if (!host) {
      return res.status(404).json({ error: 'Host not found' })
    }
    const requestData = await getAuthUserRequestStatus(event, host, authId)

    return res.status(200).json({ status: requestData.status, request: requestData.request })
  } catch (e) {
    return next(e)
  }
})

export default router
