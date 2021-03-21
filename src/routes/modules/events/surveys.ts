import { Router } from 'express'
import validateFormSurveyResponse from '../../../libs/functions/events/survey/validate-form-survey-response'
import { User } from '@florinrelea/sparc-shared/models'
import { Event, EventSurvey } from '@florinrelea/sparc-shared/models'

const Models = {
  User,
  Event,
  EventSurvey
}

const router = Router()

router.get('/:surveyId', async (req, res, next) => {
  const authId = res.locals.user
  const { surveyId } = req.params

  const q = req.query || {}
  const { token } = q
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let payload = {
    event: {
      event_image: ''
    },
    host: {
      profile_image: ''
    },
    title: '',
    packed_form: ''
  }

  try {
    const survey = await Models.EventSurvey.findById(surveyId)

    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' })
    }

    if (survey.token !== token) {
      return res.status(401).json({ error: 'Unauthorized! Token not found.' })
    }

    if ((survey.completed_by || []).includes(authId)) {
      return res.status(401).json({ error: 'You have already completed this survey' })
    }

    if (survey.event_created_by === authId) {
      return res.status(401).json({ error: 'You cannot complete your own survey' })
    }

    const eventDocument = await Models.Event.findById(survey.event_id, 'event_image') || { event_image: '' }
    const eventImage = eventDocument.event_image

    if (!eventImage) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const hostDocument = await Models.User.findById(survey.event_created_by, 'profile_image') || { profile_image: '' }
    const hostImage = hostDocument.profile_image

    if (!hostImage) {
      return res.status(404).json({ error: 'Survey owner was not found' })
    }

    payload = {
      event: {
        event_image: eventImage
      },
      host: {
        profile_image: hostImage
      },
      title: survey.title,
      packed_form: survey.packed_form
    }
  } catch (e) {
    return next(e)
  }

  return res.status(200).json({ survey: payload })
})

router.post('/:surveyId/response', async (req, res, next) => {
  const authId = res.locals.user
  const { surveyId } = req.params

  const b = req.body || {}
  const { token: clientToken, responses } = b

  if (!clientToken || !responses) {
    return res.status(400).json({ error: 'Wrong request' })
  }

  if (!Array.isArray(responses)) {
    return res.status(400).json({ error: 'Wrong response format' })
  }

  let survey
  try {
    survey = await Models.EventSurvey.findById(surveyId)
  } catch (e) {
    return next(e)
  }

  if (!survey) {
    return res.status(404).json({ error: 'Survey not found' })
  }

  try {
    validateFormSurveyResponse(survey.packed_form, JSON.stringify(responses))
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  if (survey.event_created_by === authId) {
    return res.status(401).json({ error: 'You cannot respond to your own survey' })
  }

  if ((survey.completed_by || []).includes(authId)) {
    return res.status(401).json({ error: 'You have already completed this survey' })
  }

  try {
    const responseRecord = {
      user_id: authId,
      responses
    }
    await Models.EventSurvey.findByIdAndUpdate(surveyId, {
      $push: {
        responses: responseRecord,
        completed_by: authId
      }
    })
  } catch (e) {
    return next(e)
  }

  return res.status(200).send()
})

export default router
