import { Router } from 'express'
import { IEvent } from '@florinrelea/sparc-shared/@types/models/event/Event'
import { IUser, IUserDocument } from '@florinrelea/sparc-shared/@types/models/user/User'
import { Event, User, Tag } from '@florinrelea/sparc-shared/models'
import { ITag } from '@florinrelea/sparc-shared/@types/models/Tag'
import getAuthUserRequestStatus from '../../../../libs/functions/events/get-auth-user-request-status'
import checkIfAuthentificated from '../../../../middlewares/check-if-authentificated'
import authentification from '../../../../middlewares/authentification'
import generatePublicEvent from '../../../../libs/modules/events/generate-public-event.js'
import eventAnalytics from '../../../../libs/modules/events/analytics'
import { pickPropertiesFromObject } from '../../../../utils'
import { save as saveSearch } from '../../../../libs/modules/analytics/search'

import basicRoute from './basic'
import filterRoute from './filter'
import calendarRoute from './calendar'

const Models = {
  Event,
  User,
  Tag
}

const router = Router()

// This route shouldn't require authentification
router.use('/basic', basicRoute)
router.use('/filter', filterRoute)
router.use('/calendar', calendarRoute)

router.get('/q/:string', checkIfAuthentificated, async (req, res, next) => {
  const authId = (res.locals && res.locals.user) ? res.locals.user : ''
  let resultsCount = 0
  let limit = 10
  const query = req.params.string.toLowerCase()
  // Validation
  if (!query || (query.length < 3)) {
    return res.status(400).json({ error: 'Wrong string query' })
  }
  const queryKeywords = query.split(' ')
  let results = []
  let lastId = null
  let type = 'all'
  const executionStart = Date.now()
  if (req.query) {
    const q = req.query
    if (q.lastId) lastId = q.lastId
    if (q.limit) limit = Number(q.limit)
    if (q.type) {
      if ((q.type === 'passed') || (q.type === 'upcoming')) type = q.type
    }
  }
  /*
    Score system (string included in):
    {
      title: 4,
      tag: 3,
      description: 2,
    }
    host: {
      first_name: 5,
      last_name: 5,
      first_name + last_name: 6
    }
    keyword includes:
      -= 1
  */
  const filter: {
    [key: string]: any
  } = {
    private: {
      $ne: true
    }
  }

  // Get results by type of time
  if (type) {
    if (type === 'passed') {
      filter.timestamp_end = { $lte: Date.now() }
    } else if (type === 'upcoming') {
      filter.timestamp_end = { $gt: Date.now() }
    }
  }

  let all
  try {
    all = await Models.Event.find(filter)
  } catch (e) {
    return next(e)
  }

  const cachedTags: {
    [key: string]: ITag
  } = {}
  const cachedUsers: {
    [key: string]: IUserDocument
  } = {}

  for (const id in all) {
    const event = all[id]
    if (event.private === true) continue
    let score = 0
    // Search by tags
    if (event.tags) {
      for (const t of Object.values(event.tags)) {
        let rawTag = null
        // If the tag is cached
        if (cachedTags[t]) {
          rawTag = cachedTags[t]
        } else {
          try {
            rawTag = await Models.Tag.findById(t)
          } catch (e) {
            console.error(e)
          }
          // Cache tag
          if (rawTag) {
            cachedTags[t] = rawTag
          }
        }
        if (!rawTag) continue
        const tagName = rawTag.value.toLowerCase()
        if (query.includes(tagName)) {
          score += 3
        } else {
          let found = false
          const splitName = tagName.split(' ')
          splitName.forEach(word => {
            if (queryKeywords.some(matchword => matchword === word)) {
              found = true
            }
          })
          if (found) score += 2
        }
      }
    }
    // Search by title
    const title = event.event_name.toLowerCase()
    if (title.includes(query)) score += 4
    else {
      let found = false
      const splitTitle = title.split(' ')
      splitTitle.forEach(word => {
        if (queryKeywords.some(matchword => matchword === word)) {
          found = true
        }
      })
      if (found) score += 2
    }
    // Search by description
    const description = event.event_description.toLowerCase()
    if (description.includes(query)) score += 2
    else {
      const splitDescription = description.split(' ')
      splitDescription.forEach(word => {
        if (queryKeywords.some(matchword => matchword === word)) score += 1
      })
    }
    // Search by host
    let host
    if (cachedUsers[event.created_by]) {
      host = cachedUsers[event.created_by]
    } else {
      try {
        host = await Models.User.findOne({
          _id: event.created_by,
          'control_panel.profile_private': {
            $ne: true
          }
        })
      } catch (e) {
        console.error(e)
      }

      // Cache user
      if (host) {
        cachedUsers[host._id] = host
      }
    }
    if (!host) continue
    const firstName = host.first_name.toLowerCase()
    const lastName = host.last_name.toLowerCase()
    if (query.includes(`${firstName} ${lastName}`)) {
      score += 6
    } else {
      if (query.includes(firstName)) score += 1
      if (query.includes(lastName)) score += 1
    }

    if (score > 0) {
      // Push event to results
      results.push({
        searchScore: score,
        event
      })
    }
  }
  results = results.sort((a, b) => b.searchScore - a.searchScore)

  resultsCount = results.length

  // Get from last id
  if (lastId) {
    let indexOfId = 0
    for (const i in results) {
      if (results[i].event._id === lastId) {
        indexOfId = parseInt(i, 10) + 1
      }
    }
    results = results.slice(indexOfId)
  }
  // Limit results
  results = results.slice(0, limit)

  // Assign public data
  for (const index in results) {
    const resultObject = results[index]
    const { event } = resultObject
    const host = cachedUsers[event.created_by]
    const result = await generatePublicEvent(event, host, authId)
    results[index] = {
      searchScore: resultObject.searchScore,
      ...result
    }
  }

  const executionTime = Date.now() - executionStart

  try {
    await saveSearch(query, authId || null, req.ip)
  } catch (e) {
    console.error('Could not save searched term')
    console.error(e)
  }
  return res.status(200).json({
    executionTime, resultsCount, resultsLimit: limit, results
  })
})

router.get('/id/:id', authentification, async (req, res, next) => {
  const target = req.params.id
  const authId = res.locals.user

  let event
  try {
    event = await Models.Event.findById(target)
  } catch (e) {
    return next(e)
  }

  if (!event) {
    return res.status(404).json({ error: 'not found' })
  }

  // Check if the host has a private profile
  let host
  try {
    host = await Models.User.findOne({
      _id: event.created_by,
      'control_panel.profile_private': {
        $ne: true
      }
    })
  } catch (e) {
    return next(e)
  }

  if (!host) {
    return res.status(404).json({ error: 'Host not found!' })
  }

  const realTags = []
  try {
    // Get only tags names
    for (const index in event.tags) {
      const id = event.tags[index]
      const tag = await Models.Tag.findById(id)
      if (!tag) continue

      realTags.push(tag.value)
    }
  } catch (e) {
    return next(e)
  }

  // Get auth user status
  let request
  try {
    request = await getAuthUserRequestStatus(event, host, authId)
  } catch (e) {
    return next(e)
  }

  // Collect event data
  const requiredProps: Array<keyof IEvent> = ['capacity', 'event_image', 'event_video', 'attachments', 'waitlist_enabled', 'waitlist_auto', 'cause', 'charity', 'created_by', 'timestamp_start', 'timestamp_end', 'event_description', 'event_name', 'price', 'event_type', '_id', 'registration_requisite', 'registration_file', 'registration_form', 'requires_confirmation', 'tags', 'settings']
  const hostRequiredProps: Array<keyof IUser> = ['_id', 'first_name', 'last_name', 'following', 'followed_by', 'host_rating', 'control_panel', 'recruiter_confirmed', 'profile_image', 'recruiter_logo', 'website', 'facebook', 'instagram', 'twitter', 'linkedin']

  const responseEvent: {
    host: Partial<IUserDocument>
    phone?: string
    request_status: string | null
    participation_request: any
    request_id?: string
    request_type?: string
  } & Partial<IEvent> = {
    ...pickPropertiesFromObject(event.toObject(), requiredProps),
    host: {
      ...pickPropertiesFromObject(host.toObject(), hostRequiredProps)
    },
    request_status: request.status,
    participation_request: request.request || {},
    tags: realTags
  }
  /**
   *
    locations?: {
      accepted: string | undefined
      default: string | undefined
    }
    maps?: {
      accepted?: string
      default?: string
    }
   */

  // Assing request id if pending payment
  if (responseEvent.request_status === 'pending_payment') {
    responseEvent.request_id = request.request.id
    responseEvent.request_type = request.request.type
  }

  // Display phone number
  if (event.display_phone && host.phone && responseEvent.request_status === 'attending') {
    responseEvent.phone = host.phone
  }

  // Collect conditional props
  if (event.locations) {
    // Check for maps
    if (responseEvent.request_status === 'attending') {
      responseEvent.locations = {
        accepted: event.locations.accepted
      }
      responseEvent.maps = {
        accepted: event.maps.accepted
      }
    } else {
      responseEvent.locations = {
        default: event.locations.default
      }
      responseEvent.maps = {
        default: event.maps.default
      }
    }
  }

  try {
    await eventAnalytics.views.addEventView(target)
  } catch (e) {
    console.error(e)
  }

  return res.status(200).json(responseEvent)
})

export default router
