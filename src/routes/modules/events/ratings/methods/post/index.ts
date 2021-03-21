import { Router } from 'express'
import {
  Event, EventAttendance, User, UserRating
} from '@florinrelea/sparc-shared/models'
import { IUserRating } from '@florinrelea/sparc-shared/@types/models/user/Ratings'
import authentification from '../../../../../../middlewares/authentification'
import { event as eventGlobals } from '../../../../../../globals/importable/variables'
import { updateHostRating } from '../../../../../../libs/modules/users/rating'

const Models = {
  Event,
  User,
  UserRating,
  EventAttendance
}

const { LEAVE_RATING_RANGE } = eventGlobals

async function sendHostRating(userId: string, ratingObject: IUserRating['host'][0]): Promise<void> {
  const hasRatings = await Models.UserRating.exists({ _id: userId })
  if (!hasRatings) {
    const document = new UserRating({
      _id: userId,
      host: [ratingObject]
    })
    await document.save()
  } else {
    await Models.UserRating.findByIdAndUpdate(userId, {
      $push: {
        host: ratingObject
      }
    })
  }
}

const router = Router()

router.use(authentification)

router.post('/eventrating', async (req, res) => {
  const authId = res.locals.user
  try {
    if (
      !req.body.id
      || !req.body.rating
    ) {
      return res.status(400).json({ error: 'Wrong request' })
    }
    const eventId = req.body.id
    const rating: IUserRating['host'][0] = {
      competency: req.body.rating.competency,
      punctuality: req.body.rating.punctuality,
      vibe: req.body.rating.vibe,
      venue_signal: req.body.rating.venue_signal,
      interaction: req.body.rating.interaction,
      value: req.body.rating.value,
      final_rate: req.body.rating.final_rate,
      comment: req.body.rating.comment || '',
      timestamp: Date.now(),
      from_user_id: authId,
      event_id: eventId
    }
    const user = await Models.User.findById(authId)
    const event = await Models.Event.findById(eventId)
    if (!event) {
      return res.status(404).json({ error: 'Event does not exist!' })
    }
    const host = await Models.User.findById(event.created_by)
    if (!host) {
      return res.status(500).json({ error: 'This host does not exist!' })
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    // Check if this type of user allows reviews
    if (host.recruiter_confirmed === true) {
      return res.status(401).json({ error: 'You cannot leave a rating for this user!' })
    }
    // Check if user confirmed attendance
    const eventAttendance = (await Models.EventAttendance.findById(event._id, 'confirmed'))
    const confirmedUsers = eventAttendance?.confirmed || []
    const confirmed_attendance = confirmedUsers.includes(authId)
    if (!confirmed_attendance) {
      return res.status(401).json({ error: 'You did not confirm your attendance!' })
    }
    // Authorization check
    if (event.rated_by) {
      if (event.rated_by.find(somekey => somekey === user._id)) {
        return res.status(401).json({ error: 'You have already rated this event!' })
      }
    }
    if (user.attended_events) {
      if (!user.attended_events.find(idxkey => idxkey === event._id)) {
        return res.status(401).json({ error: 'You did not participate!' })
      }
    }
    if (user.hosted_events) {
      if (user.hosted_events.find(idxkey => idxkey === event._id)) {
        return res.status(401).json({ error: 'You cannot leave a rating for your event!' })
      }
    }
    const eventEnding = event.timestamp_end
    const now = Date.now()
    const ratingTerm = LEAVE_RATING_RANGE
    if (now < eventEnding) {
      return res.status(401).json({ error: 'This event will take place soon!' })
    }
    if (eventEnding + ratingTerm < now) {
      return res.status(401).json({ error: 'The rating range has passed! You cannot rate this engagement anymore!' })
    }
    await Models.User.findByIdAndUpdate(user._id, {
      $push: {
        rated_events: event._id
      }
    })
    await Models.Event.findByIdAndUpdate(event._id, {
      $push: {
        rated_by: authId
      }
    })
    await sendHostRating(host._id, rating)
    await updateHostRating(event.created_by)
    return res.status(200).send()
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected error!' })
  }
})

export default router
