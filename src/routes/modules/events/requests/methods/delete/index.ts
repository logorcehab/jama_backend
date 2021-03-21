import { Router } from 'express'
import { Event, User } from '@florinrelea/sparc-shared/models'
import { IEvent } from '@florinrelea/sparc-shared/@types/models/event/Event'

const Models = {
  Event,
  User
}

const router = Router()

router.delete('/cancel/:id/', async (req, res, next) => {
  const target = req.params.id

  const authId = res.locals.user
  let event
  try {
    event = await Models.Event.findById(target)
  } catch (e) {
    return next(e)
  }
  if (!event) {
    return res.status(404).json({ error: 'Event not found!' })
  }

  // Find request id
  const validTypes: Array<keyof IEvent> = ['virtual_attending', 'users_attending', 'pending_virtual', 'pending_inperson']
  let requestId = null
  let type = null
  for (const requestType of validTypes) {
    if (event[requestType]) {
      for (const request in event[requestType]) {
        if (event[requestType][request] === authId) {
          type = requestType
          requestId = request
        }
      }
    }
  }

  if (!requestId) {
    return res.status(404).json({ error: 'No request found!' })
  }

  if (Date.now() >= event.timestamp_start) {
    return res.status(401).json({ error: 'You cannot cancel your participation! This engagement already started.' })
  }

  try {
    const userActions: {
      $pull: any
      $inc?: any
    } = {
      $pull: {
        attended_events: event._id
      }
    }
    if (type && type.includes('attending')) {
      userActions.$inc = {
        number_of_attended_events: -1
      }
    }
    await Models.User.findByIdAndUpdate(authId, userActions)
    await Models.Event.findByIdAndUpdate(event._id, {
      $unset: {
        [`${type}.${requestId}`]: 1
      }
    })
    if (event.registrants_files && event.registrants_files[requestId]) {
      await Models.Event.findByIdAndUpdate(event._id, {
        $unset: {
          [`registrants_files.${requestId}`]: 1
        }
      })
    }
    if (event.registrants_forms && event.registrants_forms[requestId]) {
      await Models.Event.findByIdAndUpdate(event._id, {
        $unset: {
          [`registrants_forms.${requestId}`]: 1
        }
      })
    }
  } catch (e) {
    return next(e)
  }
  return res.status(200).send()
})

export default router
