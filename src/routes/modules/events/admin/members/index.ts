import { Router, Request, Response } from 'express'
import convertHTMLToPDF from 'html-pdf'
import { Event, EventAttendance, User } from '@florinrelea/sparc-shared/models'
import { IUser } from '@florinrelea/sparc-shared/@types/models/user/User'
import authorizeMember from '../../../../../middlewares/authorize-member'
import getAllRegistrants from '../../../../../libs/functions/get-all-registrants-ids-and-types-from-event'
import mustacheRenderer from '../../../../../libs/modules/mustache-renderer'

const Models = {
  User,
  Event,
  EventAttendance
}

interface IUserObject extends IUser {
  registration_type: string
}

const router = Router()

router.use(authorizeMember)

router.get('/advanced-filter/keywords/:eventId/:section', async (req, res, next) => {
  const authId = res.locals.user
  const q = req.query
  if (!q) {
    return res.status(400).json({ error: 'Expected payload!' })
  }
  const rawKeywords = q.keywords
  if (!rawKeywords) {
    return res.status(400).json({ error: 'Expected at least 1 keyword!' })
  }

  let keywords = String(rawKeywords).toLowerCase().split(',')
  if (keywords.length === 0) {
    return res.status(400).json({ error: 'Expected at least 1 keyword!' })
  }
  // Remove spaces at the beginning or end
  keywords = keywords.map(item => item.trim())

  if (keywords.length >= 10) {
    return res.status(400).json({ error: 'Limit of 10 keywords exceeded!' })
  }

  const eventId = String(req.params.eventId)
  const section = String(req.params.section) as 'institute' | 'about' | 'headline'

  // Validate section
  const validSections = ['institute', 'about', 'headline']

  if (!validSections.includes(section)) {
    return res.status(400).json({ error: `Invalid section: ${section}` })
  }

  let event

  try {
    event = await Models.Event.findById(eventId)
  } catch (e) {
    return next(e)
  }

  if (!event) {
    return res.status(404).json({ error: 'Event not found!' })
  }

  if (event.created_by !== authId) {
    return res.status(401).json({ error: 'Unauthorized!' })
  }

  const registrantsObjects = getAllRegistrants(event)

  const registrants = []

  for (const registrantObject of registrantsObjects) {
    const userId = registrantObject._id
    try {
      const user = await Models.User.findById(userId)
      if (!user) continue
      const userObject: IUserObject = {
        ...user,
        registration_type: registrantObject.type
      }
      registrants.push(userObject)
    } catch (e) {
      await global.log_err({ serverRequest: req, error: e })
      continue
    }
  }

  const results = []
  for (const user of registrants) {
    const finalObject = {
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_image: user.profile_image,
      text: '',
      occurrences: 0
    }

    if (!user[section]) {
      results.push(finalObject)
      continue
    }

    finalObject.text = user[section].toLowerCase()

    for (const keyword of keywords) {
      finalObject.text = finalObject.text.replace(new RegExp(keyword, 'g'), `<mark>${keyword}</mark>`)
      finalObject.occurrences += (finalObject.text.match(new RegExp(keyword, 'g')) || []).length
    }

    results.push(finalObject)
  }

  return res.status(200).json({ results })
})

async function middleware(req: Request, res: Response) {
  const authId = res.locals.user
  const { eventId } = req.params
  const q = req.query
  let filter = ''

  if (q && q.filter) {
    filter = String(q.filter)
  }

  const event = await Models.Event.findById(eventId)
  if (!event) {
    res.status(404).json({ error: 'Event not found' })
    return null
  }

  if (event.created_by !== authId) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }

  let registrantsObjects = getAllRegistrants(event)

  const registrants = []

  if (filter === 'confirmed-attendance') {
    const attendanceDocument = await Models.EventAttendance.findById(eventId, 'confirmed') || { confirmed: [] }
    const confirmedUsersIds: Array<string> = attendanceDocument.confirmed

    registrantsObjects = registrantsObjects.filter(el => confirmedUsersIds.includes(el._id))
  }

  for (const registrantObject of registrantsObjects) {
    const userId = registrantObject._id
    try {
      const rawUser = await Models.User.findById(userId)
      if (!rawUser) continue
      const user = {
        ...rawUser,
        registration_type: registrantObject.type
      }
      registrants.push(user)
    } catch (e) {
      console.error(e)
      continue
    }
  }
  // Collect data
  const fieldsToCollectFromUser: Array<keyof typeof registrants[0]> = ['first_name', 'last_name', 'ethnicity', 'gender', 'current_city', 'email', 'institute', 'headline']
  const guests = registrants.map(user => {
    const data: {
      [key: string]: any
    } = {}
    fieldsToCollectFromUser.forEach(field => {
      data[field] = user[field]
    })
    return data
  })

  return guests
}

router.get('/advanced-filter/:eventId', async (req, res, next) => {
  let guests
  try {
    guests = await middleware(req, res)
  } catch (e) {
    return next(e)
  }

  if (guests === null) return null

  const filtersOptions = {
    current_city: [...new Set(guests.map(user => user.current_city))]
  }

  return res.status(200).json({ guests, filtersOptions })
})

router.get('/advanced-filter/:eventId', async (req, res, next) => {
  let guests
  try {
    guests = await middleware(req, res)
  } catch (e) {
    return next(e)
  }

  if (guests === null) return null

  const filtersOptions = {
    current_city: [...new Set(guests.map(user => user.current_city))]
  }

  return res.status(200).json({ guests, filtersOptions })
})
router.get('/advanced-filters/export-pdf/:eventId/Advanced-Filters.pdf', async (req, res, next) => {
  let guests
  try {
    guests = await middleware(req, res)
  } catch (e) {
    return next(e)
  }

  if (guests === null) return null

  const tableData = []
  for (const user of guests) {
    const collection: {
      [key: string]: string
    } = {}
    collection['First Name'] = user.first_name
    collection['Last Name'] = user.last_name
    collection.Ethnicity = user.ethnicity
    collection.Gender = user.gender
    collection['Current City'] = user.current_city
    collection.Email = user.email
    collection.School = user.institute
    collection.Headline = user.headline

    tableData.push(Object.values(collection))
  }

  const rendererData = {
    tableProps: ['First Name', 'Last Name', 'Ethnicity', 'Gender', 'Current City', 'Email', 'School', 'Headline'],
    users: tableData
  }

  let html
  try {
    html = mustacheRenderer({ filePath: './routes/modules/events/admin/members/components/advanced-filters.html', data: rendererData })
  } catch (e) {
    return next(e)
  }

  convertHTMLToPDF.create(html, { format: 'A4' }).toStream((err, stream) => {
    if (err) {
      res.status(500).json({ error: 'Internal server error!' })
      return
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline;filename=Advanced-Filters.pdf')
    stream.pipe(res)
  })
  return true
})

export default router
