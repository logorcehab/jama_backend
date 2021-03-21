import { Router } from 'express'
import { scheduleNotification } from '@florinrelea/sparc-shared/libs/modules/worker'
import getAuthUserRequestStatus from '../../../../libs/functions/events/get-auth-user-request-status'
import { event as eventGlobals } from '../../../../globals/importable/variables'
import { Event, PaidEventComplaints, User } from '@florinrelea/sparc-shared/models'

const Models = {
  Event,
  PaidEventComplaints,
  User
}

const { PAID_ENGAGEMENT_COMPLAINT_RANGE } = eventGlobals

const router = Router()

router.post('/post/:eventId', async (req, res, next) => {
  const authId = res.locals.user
  const { eventId } = req.params

  const { body } = req
  if (!body) {
    return res.status(400).json({ error: 'Expected payload!' })
  }

  const { subject, complaint } = body
  if (!subject || !complaint) {
    return res.status(400).json({ error: 'Expected subject and complaint!' })
  }

  if (subject.length > 1500 || complaint.length > 5000) {
    return res.status(400).json({ error: 'Your content is too long!' })
  }

  let event
  let host

  try {
    event = await Models.Event.findById(eventId)
  } catch (e) {
    return next(e)
  }

  if (!event) {
    return res.status(404).json({ error: 'Engagement not found!' })
  }

  if (!event.price) {
    return res.status(401).json({ error: 'This engagement does not accept this feature!' })
  }

  try {
    host = await Models.User.findById(event.created_by)
  } catch (e) {
    return next(e)
  }

  if (!host) {
    return res.status(404).json({ error: 'Host not found' })
  }

  let userRequestStatus
  try {
    userRequestStatus = await getAuthUserRequestStatus(event, host, authId)
  } catch (e) {
    return next(e)
  }

  if (!(userRequestStatus.request.label || '').includes('attending')) {
    return res.status(401).json({ error: 'Unauthorized!' })
  }

  // Check time
  const complaintRange = PAID_ENGAGEMENT_COMPLAINT_RANGE
  if (Date.now() < event.timestamp_end && Date.now() > event.timestamp_end + complaintRange) {
    return res.status(401).json({ error: 'You cannot leave a complaint! It is too early or 36 hours passed!' })
  }

  try {
    const hasComplaints = await Models.PaidEventComplaints.findById(event._id)
    if (hasComplaints) {
      await Models.PaidEventComplaints.findByIdAndUpdate(event._id, {
        $push: {
          complaints: {
            user_id: authId,
            subject,
            complaint,
            timestamp: Date.now()
          }
        }
      })
    } else {
      await new Models.PaidEventComplaints({
        _id: event._id,
        complaints: []
      }).save()
    }
    // Add compliant to event
    await Models.Event.findByIdAndUpdate(event._id, {
      has_complaints: true
    })
  } catch (e) {
    return next(e)
  }

  // Send admin notification
  try {
    await scheduleNotification.admin.events.paidEngagementComplaint({
      event_id: event._id,
      user_id: authId
    })
  } catch (e) {
    console.error(e)
  }

  return res.status(200).send()
})

export default router
