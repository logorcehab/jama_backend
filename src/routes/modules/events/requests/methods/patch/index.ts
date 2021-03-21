import { Router } from 'express'
import { Event, User } from '@florinrelea/sparc-shared/models'

import { IEvent } from '@florinrelea/sparc-shared/@types/models/event/Event'

import { scheduleNotification } from '@florinrelea/sparc-shared/libs/modules/worker'

const Models = {
  Event,
  User
}

const router = Router()

router.patch('/shiftrejected', async (req, res, next) => {
  const authId = res.locals.user
  const b = req.body
  if (!b || !b.event || !b.request) {
    return res.status(400).json({ error: 'Wrong request!' })
  }

  const eventId = b.event
  const requestId = b.request

  let event
  try {
    event = await Models.Event.findById(eventId)
  } catch (e) {
    return next(e)
  }

  if (!event) {
    return res.status(404).json({ error: 'Event does not exist' })
  }

  const eventHasPassed = event.timestamp_end < Date.now()
  if (eventHasPassed) {
    return res.status(400).json({ error: 'This event has passed!' })
  }

  // Check if is the host
  if (event.created_by !== authId) {
    return res.status(401).json({ error: 'Unauthorized!' })
  }

  // Find request
  const request: {
    user: string
    label: string
    type: 'virtual' | 'inperson'
  } = {
    user: '',
    label: '',
    type: 'inperson'
  }
  const labels: Array<keyof IEvent> = ['rejected_virtual', 'rejected_inperson']
  for (const label of labels) {
    if (event[label]) {
      const requests = event[label]
      Object.keys(requests).forEach(id => {
        if (id === requestId) {
          request.user = requests[id]
          request.label = label
          request.type = label.includes('virtual') ? 'virtual' : 'inperson'
        }
      })
    }
  }

  if (!request.user) {
    return res.status(400).json({ error: 'Request does not exist!' })
  }

  // If request type counter > capacity of request type
  let places_taken = 0
  const atendeesLabel = request.type === 'virtual' ? 'virtual_attending' : 'users_attending'
  if (event[atendeesLabel]) {
    places_taken = Object.keys(event[atendeesLabel]).length
  }

  const capacityOfType = event.capacity[request.type] as number

  if (places_taken >= capacityOfType) {
    return res.status(400).json({ error: 'No spots left!' })
  }

  try {
    await Models.Event.findByIdAndUpdate(event._id, {
      $unset: {
        [`${request.label}.${requestId}`]: 1
      }
    })
    let label = 'users_attending'
    if (request.type === 'virtual') {
      label = 'virtual_attending'
    }
    await Models.Event.findByIdAndUpdate(event._id, {
      $set: {
        [`${label}.${requestId}`]: request.user
      }
    })
    await Models.User.findByIdAndUpdate(request.user, {
      last_event_attended: event._id,
      $push: {
        attended_events: event._id
      },
      $inc: {
        number_of_attended_events: 1
      }
    })
    const notification = {
      event: event._id,
      request: requestId
    }
    await scheduleNotification.events.guest.acceptedRequest(notification)
  } catch (e) {
    return next(e)
  }

  return res.status(200).send()
})

export default router
