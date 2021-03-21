import { Router } from 'express'
import getAuthUserRequestStatus from '../../../../libs/functions/events/get-auth-user-request-status'

// Routes
import post from './post'

// Models
import { Event } from '@florinrelea/sparc-shared/models'
import { User } from '@florinrelea/sparc-shared/models'

const Models = {
  Event,
  User
}

const router = Router()

router.use('/post', post)
router.use('/get/attendance-page-data/:participantId/:eventId', async (req, res, next) => {
  const { participantId, eventId } = req.params
  try {
    const event = await Models.Event.findById(eventId)

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const host = await Models.User.findById(event.created_by)

    if (!host) {
      return res.status(404).json({ error: 'Host not found' })
    }

    const userRequest = await getAuthUserRequestStatus(event, host, participantId)

    if (userRequest.status !== 'confirm_attendance' && !userRequest.request.label.includes('attending')) {
      return res.status(401).json({ error: 'You did not participate at this engagement' })
    }

    if (userRequest.status !== 'confirm_attendance') {
      return res.status(401).json({ error: 'confirmed' })
    }

    const response = {
      id: event._id,
      event_name: event.event_name,
      timestamp_start: event.timestamp_start,
      timestamp_end: event.timestamp_end,
      host: {
        id: host.id,
        recruiter_confirmed: host.recruiter_confirmed
      }
    }

    return res.status(200).json({ event: response })
  } catch (e) {
    return next(e)
  }
})

export default router
