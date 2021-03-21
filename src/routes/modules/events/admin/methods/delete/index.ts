import { Router } from 'express'
import uploader from 'express-fileupload'
import deleteStorageItem from '../../../../../../libs/modules/storage/delete'
import logEventAction from '../../../../../../libs/modules/events/log-action'
import getAllRegistrantsIdsFromEvent from '../../../../../../libs/functions/get-all-registrants-ids-and-types-from-event'
import { removeUserInterest } from '../../../../../../libs/modules/users/interests'
import { scheduleNotification } from '@florinrelea/sparc-shared/libs/modules/worker'
import {
  Event, EventAttendance, DeletedEvent, User
} from '@florinrelea/sparc-shared/models'

const Models = {
  Event,
  EventAttendance,
  DeletedEvent,
  User
}

const router = Router()

router.delete('/attachment/:eventId/:encodedAttachmentUrl', async (req, res, next) => {
  const authId = res.locals.user
  const { eventId, encodedAttachmentUrl } = req.params

  const attachmentUrl = decodeURIComponent(encodedAttachmentUrl)

  let event

  try {
    event = await Models.Event.findById(eventId)
  } catch (e) {
    return next(e)
  }

  if (!event) {
    return res.status(404).json({ error: 'Event not found!' })
  }

  // Validate
  if (event.created_by !== authId) {
    return res.status(401).json({ error: 'Unauthorized!' })
  }

  if (!event.attachments) {
    return res.status(400).json({ error: 'Invalid attachment url' })
  }

  const attachmentIndex = Object.values(event.attachments).indexOf(attachmentUrl)

  if (attachmentIndex === -1) {
    return res.status(400).json({ error: 'Invalid attachment url' })
  }

  try {
    await deleteStorageItem(attachmentUrl)
  } catch (e) {
    return next(e)
  }

  try {
    const finalAttachments = Object.values(event.attachments)
    finalAttachments.splice(attachmentIndex, 1)
    await Models.Event.findByIdAndUpdate(eventId, {
      attachments: finalAttachments
    })
  } catch (e) {
    return next(e)
  }

  return res.status(200).send()
})
router.delete('/event-video/:eventId', async (req, res, next) => {
  const authId = res.locals.user
  const { eventId } = req.params

  let event

  try {
    event = await Models.Event.findById(eventId)
  } catch (e) {
    return next(e)
  }

  if (!event) {
    return res.status(404).json({ error: 'Event not found!' })
  }

  // Validate
  if (event.created_by !== authId) {
    return res.status(401).json({ error: 'Unauthorized!' })
  }

  // Check event time
  if (Date.now() > event.timestamp_start) {
    return res.status(401).json({ error: 'You cannot make changes if the engagement passed!' })
  }

  try {
    await Models.Event.findByIdAndUpdate(event._id, {
      $unset: {
        event_video: 1
      }
    })
  } catch (e) {
    return next(e)
  }

  try {
    await deleteStorageItem(event.event_video)
  } catch (e) {
    console.error(e)
  }
  // Log
  try {
    await logEventAction(eventId, `Removed event video from ip: ${req.ip}`)
  } catch (e) {
    console.error(e)
  }

  return res.status(200).send()
})
router.delete('/id/:id', uploader(), async (req, res, next) => {
  const target = String(req.params.id)
  const authId = res.locals.user

  let eventData
  try {
    eventData = await Models.Event.findById(target)
  } catch (e) {
    return next(e)
  }
  if (!eventData) {
    return res.status(404).json({ error: 'Event not found!' })
  }

  if (authId !== eventData.created_by) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const eventTimestamp = eventData.timestamp_start
  if (Date.now() > eventTimestamp) {
    try {
      await new Models.DeletedEvent(eventData).save()
      await Models.Event.findByIdAndDelete(eventData._id)
    } catch (e) {
      return next(e)
    }
  } else {
    let hosted_events
    try {
      const rawData = await Models.User.findById(authId, 'hosted_events')
      hosted_events = (rawData || {}).hosted_events || []
    } catch (e) {
      return next(e)
    }
    for (const eventId of hosted_events) {
      if (eventId === target) {
        try {
          await Models.User.findByIdAndUpdate(authId, {
            $pull: {
              hosted_events: eventId
            },
            $inc: {
              number_of_hosted_events: -1
            }
          })
        } catch (e) {
          return next(e)
        }
      }
    }
    try {
      // Then move the event from the database
      await new Models.DeletedEvent(eventData).save()
    } catch (e) {
      return next(e)
    }
    // Remove events from attended_events
    const participantsObjects = getAllRegistrantsIdsFromEvent(eventData)
    for (const object of participantsObjects) {
      if (object.type.includes('attending')) {
        try {
          await Models.User.findByIdAndUpdate(object._id, {
            $pull: {
              attended_events: eventData._id
            },
            $inc: {
              number_of_attended_events: -1
            }
          })
        } catch (e) {
          return next(e)
        }
      }
    }
    try {
      await Models.Event.findByIdAndRemove(target)
      // Remove interested users
      if (eventData.interested) {
        const tasks: Array<Promise<any>> = []
        for (const rawId of Object.keys(eventData.interested)) {
          const userId = String(rawId)
          tasks.push(removeUserInterest(userId, eventData._id))
        }
        await Promise.all(tasks)
      }

      // Remove attendance codes
      await Models.EventAttendance.findByIdAndDelete(eventData._id)

      // Then send email to participants
      const participants = eventData.virtual_attending
        ? Object.values(eventData.virtual_attending) : []
      if (eventData.users_attending) {
        participants.concat(Object.values(eventData.users_attending))
      }
      if (participants.length) {
        const host = await Models.User.findById(authId)
        if (host) {
          const notificationPayload = {
            host_image: host.profile_image,
            event_name: eventData.event_name,
            event_image: eventData.event_image,
            participants: JSON.stringify(participants),
            host_first_name: host.first_name,
            host_last_name: host.last_name,
            host_id: host._id,
            timestamp_start: eventData.timestamp_start,
            timestamp_end: eventData.timestamp_end
          }
          await scheduleNotification.events.guest.deletedEvent(notificationPayload)
        }
      }
    } catch (e) {
      return next(e)
    }
  }

  if (eventData.event_video) {
    try {
      await deleteStorageItem(eventData.event_video)
    } catch (e) {
      console.error(e)
    }
  }

  if (eventData.event_image) {
    try {
      await deleteStorageItem(eventData.event_image)
    } catch (e) {
      console.error(e)
    }
  }

  if (eventData.event_image_lg) {
    try {
      await deleteStorageItem(eventData.event_image_lg)
    } catch (e) {
      console.error(e)
    }
  }

  return res.status(200).send()
})

export default router
