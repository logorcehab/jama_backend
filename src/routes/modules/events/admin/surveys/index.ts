import { Router } from 'express'
import crypto from 'crypto'
import { Event, EventSurvey, User } from '@florinrelea/sparc-shared/models'
import { IUser } from '@florinrelea/sparc-shared/@types/models/user/User'
import { IEventSurvey } from '@florinrelea/sparc-shared/@types/models/event/Survey'
import Validator from '../../../../../libs/modules/validatorjs'
import validateSurveyForm from '../../../../../libs/functions/events/survey/validate-survey-form'

const Models = {
  Event,
  User,
  EventSurvey
}

const router = Router()

router.post('/:eventId/create', async (req, res, next) => {
  const authId = res.locals.user
  const { eventId } = req.params
  const b = req.body

  if (!b || !b.title || !b.packed_form) {
    return res.status(400).json({ error: 'Wrong request' })
  }

  const titleValidation = new Validator({ title: b.title }, { title: 'string|between:2,200' })
  if (titleValidation.fails()) {
    return res.status(400).json({ error: 'You title must have at least 2 characters and max 200 characters' })
  }

  let event
  try {
    event = await Models.Event.findById(eventId)
  } catch (e) {
    return next(e)
  }

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  if (event.created_by !== authId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Validate packed form
  const receivedForm = b.packed_form
  try {
    validateSurveyForm(receivedForm)
  } catch (e) {
    return res.status(400).json({ error: e })
  }

  const survey = {
    title: b.title,
    packed_form: receivedForm,
    token: crypto.randomBytes(24).toString('hex'),
    event_id: eventId,
    event_created_by: authId,
    completed_by: []
  }

  let surveyId = ''

  try {
    const savedObject = await new Models.EventSurvey(survey).save()
    surveyId = savedObject._id

    await Models.Event.findByIdAndUpdate(eventId, {
      $push: {
        surveys: surveyId
      }
    })
  } catch (e) {
    return next(e)
  }

  const surveyUrl = `https://sparc.world/survey/${surveyId}?token=${survey.token}`

  return res.status(200).json({ survey_url: surveyUrl })
})

router.patch('/:surveyId', async (req, res, next) => {
  const authId = res.locals.user
  const { surveyId } = req.params
  const b = req.body

  if (!b || !b.title || !b.packed_form) {
    return res.status(400).json({ error: 'Wrong request' })
  }

  const titleValidation = new Validator({ title: b.title }, { title: 'string|between:2,200' })
  if (titleValidation.fails()) {
    return res.status(400).json({ error: 'You title must have at least 2 characters and max 200 characters' })
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

  if (survey.event_created_by !== authId) {
    return res.status(401).json({ error: ' Unauthorized' })
  }

  // Validate packed form
  const receivedForm = b.packed_form
  try {
    validateSurveyForm(receivedForm)
  } catch (e) {
    return res.status(400).json({ error: e })
  }

  try {
    await Models.EventSurvey.findByIdAndUpdate(surveyId, {
      title: b.title,
      packed_form: b.packed_form
    })
  } catch (e) {
    return next(e)
  }

  const surveyUrl = `https://sparc.world/survey/${survey.id}?token=${survey.token}`

  return res.status(200).json({ survey_url: surveyUrl })
})

router.get('/id/:surveyId', async (req, res, next) => {
  const authId = res.locals.user
  const { surveyId } = req.params

  let survey
  try {
    survey = await Models.EventSurvey.findById(surveyId)
  } catch (e) {
    return next(e)
  }

  if (!survey) {
    return res.status(404).json({ error: 'Survey not found' })
  }

  if (survey.event_created_by !== authId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!survey.responses) {
    return res.status(200).json({ survey, responses: [] })
  }

  const { responses } = survey

  const formattedSurvey = {
    ...survey,
    responses: undefined
  }

  const formattedResponses: {
    responses: string[]
    user: Partial<IUser>
  }[] = []

  for (const responseObject of responses) {
    const { user_id: userId, responses: userResponses } = responseObject
    try {
      const user = await Models.User.findById(userId)

      if (!user) continue

      const userData: Partial<IUser> = {
        first_name: user.first_name,
        last_name: user.last_name,
        profile_image: user.profile_image,
        _id: user._id
      }

      formattedResponses.push({
        responses: userResponses,
        user: userData
      })
    } catch (e) {
      continue
    }
  }

  return res.status(200).json({ formattedSurvey, responses: formattedResponses })
})
router.get('/by-event/:eventId', async (req, res, next) => {
  const authId = res.locals.user
  const { eventId } = req.params
  let event
  try {
    event = await Models.Event.findById(eventId)
  } catch (e) {
    return next(e)
  }

  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  if (event.created_by !== authId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!event.surveys) {
    return res.status(200).json({ surveys: [] })
  }

  const surveys = []
  for (const surveyId of event.surveys) {
    try {
      const survey = await Models.EventSurvey.findById(surveyId)

      if (!survey) continue

      const requiredProps: (keyof IEventSurvey)[] = ['title', '_id', 'completed_by']
      const finalSurvey: {
        [key: string]: any
      } = {}

      for (const prop of requiredProps) {
        finalSurvey[prop] = survey[prop]
      }
      surveys.push(finalSurvey)
    } catch (e) {
      continue
    }
  }

  return res.status(200).json({ surveys })
})

router.delete('/id/:surveyId', async (req, res, next) => {
  const authId = res.locals.user
  const { surveyId } = req.params

  let survey
  try {
    survey = await Models.EventSurvey.findById(surveyId)
  } catch (e) {
    return next(e)
  }

  if (!survey) {
    return res.status(404).json({ error: 'Survey not found' })
  }

  if (survey.event_created_by !== authId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Delete survey
    await Models.EventSurvey.findByIdAndDelete(surveyId)
    // Delete from event
    await Models.Event.findByIdAndUpdate(survey.event_id, {
      $pull: {
        surveys: surveyId
      }
    })
  } catch (e) {
    return next(e)
  }

  return res.status(200).send()
})

export default router
