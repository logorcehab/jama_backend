import { Router } from 'express'
import { Event, EventAttendance, User } from '@florinrelea/sparc-shared/models'
import { IEvent } from '@florinrelea/sparc-shared/@types/models/event/Event'
import { IUser } from '@florinrelea/sparc-shared/@types/models/user/User'

const Models = {
  User,
  Event,
  EventAttendance
}

const router = Router()

router.get('/:eventId', async (req, res, next) => {
  const authId = res.locals.user
  const { eventId } = req.params

  let confirmedUsersIds = []

  let eventDebugger
  try {
    eventDebugger = await Models.Event.findById(eventId)
  } catch (e) {
    return next(e)
  }

  const event = eventDebugger

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  if (event.created_by !== authId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const attendanceDocument = await Models.EventAttendance.findById(eventId)
    confirmedUsersIds = attendanceDocument?.confirmed || []
  } catch (e) {
    return next(e)
  }

  function findUserRequestId(userId: string): string {
    if (!event) return ''
    const labels: Array<keyof IEvent> = ['users_attending', 'virtual_attending']
    let finalRequestId = ''
    for (const label of labels) {
      if (!Object.prototype.hasOwnProperty.call(event, label)) continue
      const labelObject = event[label]
      if (!labelObject) continue

      for (const requestId in labelObject) {
        const foundUser = event[label][requestId]
        if (foundUser === userId) {
          finalRequestId = requestId
          break
        }
      }
    }

    if (finalRequestId) {
      return finalRequestId
    }

    return ''
  }

  const results = []

  for (const userId of confirmedUsersIds) {
    try {
      const user = await Models.User.findById(userId)
      if (!user) continue

      const requiredProps: Array<keyof IUser> = ['_id', 'profile_image', 'first_name', 'last_name', 'current_city', 'control_panel', 'headline']

      const finalUser: { request_id: string } & { [P in keyof IUser]?: any } = {
        request_id: ''
      }

      for (const prop of requiredProps) {
        if (Object.prototype.hasOwnProperty.call(user, prop)) {
          finalUser[prop] = user[prop]
        }
      }

      finalUser.request_id = findUserRequestId(user._id)

      results.push(finalUser)
    } catch (e) {
      console.error(e)
    }
  }

  return res.status(200).json({ results })
})

export default router
