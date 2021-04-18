import { Router } from 'express'
import { increaseGuestAttendanceRating } from '../../../../../libs/modules/users/rating'
import { event as eventGlobals } from '../../../../../globals/importable/variables'
// Models
import { Event, EventAttendance } from '@florinrelea/sparc-shared/models'

const { CONFIRM_ATTENDANCE_RANGE } = eventGlobals

const Models = {
  Event,
  EventAttendance
}

const router = Router()

router.post('/participant/:eventId/:userId', async (req, res, next) => {
  const { eventId, userId } = req.params
  const authId = String(userId)
  const maxTries = 4
  const b = req.body
  if (!b || !b.code) {
    return res.status(400).json({ error: 'Please add the 5 digit code.' })
  }
  const inputCode = b.code
  if ((/^([a-zA-Z0-9]){5}$/g).test(inputCode) !== true) {
    return res.status(400).json({ error: 'Incorrect code format!' })
  }

  try {
    const event = await Models.Event.findById(eventId)
    if (!event) {
      return res.status(404).json({ error: 'Event not found!' })
    }
    // Check if participant
    let participant = event.virtual_attending ? Object.values(event.virtual_attending) : []
    if (event.users_attending) {
      participant = participant.concat(Object.values(event.users_attending))
    }
    if (!participant.includes(authId)) {
      return res.status(401).json({ error: 'You did not participate in this event!' })
    }
    // Check the rating range
    const reviewRange = CONFIRM_ATTENDANCE_RANGE
    const now = Date.now()
    if (now < event.timestamp_start) {
      return res.status(401).json({ error: 'You can rate the engagement only after the start time!' })
    }
    if (now > event.timestamp_end + reviewRange) {
      return res.status(401).json({ error: 'You cannot confirm your attendance because the allowed range passed!' })
    }
    // Check if already accepted
    const eventAttendance = (await Models.EventAttendance.findById(event._id, 'confirmed tries'))
    if (!eventAttendance) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const confirmedUsers: string[] = eventAttendance.confirmed
    const alreadyAccepted = confirmedUsers.includes(authId)
    if (alreadyAccepted) {
      return res.status(401).json({ error: 'You have already confirmed your participation' })
    }
    // Check how many attempts has been made
    const allUsersTries = eventAttendance.tries
    const tries = (allUsersTries || {})[authId]
    let triesCount = 0
    if (tries) {
      triesCount = Object.keys(tries).length
    }
    if (triesCount >= maxTries) {
      return res.status(401).json({ error: 'You have exceeded your tries limit! You can no longer confirm your attendance.' })
    }
    const realCode = eventAttendance.code
    if (!realCode) {
      const error = 'This event does not have an attendace code!'
      return res.status(404).json({ error })
    }
    if (inputCode !== realCode) {
      // Store try in the database
      const tryData = {
        ip: req.ip,
        code: inputCode,
        timestamp: Date.now()
      }
      await Models.EventAttendance.findByIdAndUpdate(eventId, {
        $push: {
          [`tries.${authId}`]: tryData
        }
      }, { upsert: true })
      const triesLeft = maxTries - (triesCount + 1)
      const error = `Wrong code! You have ${triesLeft} more ${triesLeft !== 1 ? 'tries' : 'try'} left.`
      return res.status(401).json({ error })
    }

    // Passed
    // Store user as confirmed
    await Models.EventAttendance.findByIdAndUpdate(event._id, {
      $push: {
        confirmed: authId
      }
    })
    // Update users attendance rating
    await increaseGuestAttendanceRating(authId)
    return res.status(200).send()
  } catch (e) {
    return next(e)
  }
})

export default router
